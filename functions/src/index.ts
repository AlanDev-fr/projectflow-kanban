/**
 * 🔐 Firebase Cloud Function para GitHub OAuth
 * VERSIÓN SEGURA - App móvil React Native + Expo
 */

import * as functions from 'firebase-functions/v2';
import * as logger from 'firebase-functions/logger';
import { defineString, defineSecret } from 'firebase-functions/params';

// Client ID no es sensible, puede quedar como string
const githubClientId = defineString('GITHUB_CLIENT_ID', { default: 'Ov23liMfmvMbFcEaiB2z' });

// FIX: Secreto seguro, sin valor default hardcodeado
const githubClientSecret = defineSecret('GITHUB_CLIENT_SECRET');

const githubRedirectUri = defineString('GITHUB_REDIRECT_URI', { default: 'gestor-proyectos://oauth/callback' });

interface GitHubTokenResponse {
    access_token?: string;
    error?: string;
    error_description?: string;
}

/**
 * Cloud Function HTTP que intercambia el código de GitHub por un token
 */
export const githuboauthcallback = functions.https.onRequest(
    {
        cors: true,
        secrets: [githubClientSecret],
    },
    async (req, res) => {
        if (req.method === 'OPTIONS') {
            res.status(204).send('');
            return;
        }

        if (req.method !== 'POST') {
            res.status(405).json({ error: 'Method not allowed', message: 'Use POST' });
            return;
        }

        try {
            const { code } = req.body;

            if (!code) {
                res.status(400).json({
                    error: 'missing_code',
                    message: 'El parámetro "code" es requerido',
                });
                return;
            }

            const clientId = githubClientId.value();
            const clientSecret = githubClientSecret.value();
            const redirectUri = githubRedirectUri.value();

            logger.info('🔄 Intercambiando código por token...');

            const response = await fetch('https://github.com/login/oauth/access_token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({
                    client_id: clientId,
                    client_secret: clientSecret,
                    code,
                    redirect_uri: redirectUri,
                }),
            });

            const data = await response.json() as GitHubTokenResponse;

            if (data.access_token) {
                logger.info('Token obtenido exitosamente');
                res.status(200).json({ access_token: data.access_token });
            } else {
                logger.error('Error de GitHub:', data);
                res.status(400).json({
                    error: data.error || 'token_error',
                    message: data.error_description || 'No se pudo obtener token',
                });
            }
        } catch (error) {
            logger.error('Error interno:', error);
            res.status(500).json({
                error: 'server_error',
                message: 'Error interno',
            });
        }
    }
);

/**
 * Cloud Function para obtener información del usuario de GitHub
 */
export const getGitHubUser = functions.https.onRequest(
    {
        cors: true, // OK para app móvil nativa
    },
    async (req, res) => {
        if (req.method === 'OPTIONS') {
            res.status(204).send('');
            return;
        }

        try {
            const authHeader = req.headers.authorization;

            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                res.status(401).json({ error: 'missing_token', message: 'Token no proporcionado' });
                return;
            }

            const token = authHeader.split('Bearer ')[1];

            const response = await fetch('https://api.github.com/user', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/vnd.github.v3+json',
                },
            });

            const userData = await response.json();

            if (response.ok) {
                res.status(200).json(userData);
            } else {
                res.status(response.status).json(userData);
            }

        } catch (error: any) {
            logger.error('Error obteniendo usuario de GitHub:', error);
            res.status(500).json({ error: 'server_error', message: error.message });
        }
    }
);