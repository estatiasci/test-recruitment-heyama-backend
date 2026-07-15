// Point d'entrée pour Vercel Functions.
// Ce fichier ne contient VOLONTAIREMENT aucun décorateur NestJS : il doit
// pouvoir être lu tel quel par le builder @vercel/node, sans passer par
// notre config Babel personnalisée.
//
// Il requiert la version DÉJÀ COMPILÉE de l'appli (dist/app.module.js,
// générée par `npm run build`, qui elle applique bien Babel) plutôt que
// le code source brut avec décorateurs.
const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('./dist/app.module');

// Instance Nest gardée en mémoire entre deux invocations "à chaud" de la
// fonction, pour éviter de tout réinitialiser (et de rouvrir une connexion
// MongoDB) à chaque requête.
let cachedApp;

async function bootstrapServer() {
    if (!cachedApp) {
        const app = await NestFactory.create(AppModule);
        app.enableCors();
        await app.init();
        cachedApp = app;
    }
    return cachedApp;
}

module.exports = async (req, res) => {
    const app = await bootstrapServer();
    const httpAdapter = app.getHttpAdapter();
    return httpAdapter.getInstance()(req, res);
};