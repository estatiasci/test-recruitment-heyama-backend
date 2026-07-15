const { Module } = require('@nestjs/common');
const { MongooseModule } = require('@nestjs/mongoose');
const { ObjectsController } = require('./objects.controller');
const { ObjectsService } = require('./objects.service');
const { ObjectSchema, OBJECT_MODEL_NAME } = require('./schemas/object.schema');
const { StorageModule } = require('../storage/storage.module');

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: OBJECT_MODEL_NAME, schema: ObjectSchema },
    ]),
    StorageModule,
  ],
  controllers: [ObjectsController],
  providers: [ObjectsService],
})
class ObjectsModule {}

module.exports = { ObjectsModule };
