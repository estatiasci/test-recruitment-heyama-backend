const { Module } = require('@nestjs/common');
const { ConfigModule } = require('@nestjs/config');
const { MongooseModule } = require('@nestjs/mongoose');
const { ObjectsModule } = require('./objects/objects.module');
const { StorageModule } = require('./storage/storage.module');

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // rend le ConfigService disponible partout sans le réimporter
    }),
    MongooseModule.forRoot(process.env.MONGODB_URI),
    StorageModule,
    ObjectsModule,
  ],
})
class AppModule {}

module.exports = { AppModule };
