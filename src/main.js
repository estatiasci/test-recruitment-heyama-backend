require('reflect-metadata');
const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('./app.module');

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS activé : Notice indique que "tous les apps devraient communiquer avec l'API"
  app.enableCors();

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚀 API démarrée sur http://localhost:${port}`);
}
bootstrap();
