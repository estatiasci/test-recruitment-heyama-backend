const { Module } = require('@nestjs/common');
const { StorageService } = require('./storage.service');

@Module({
  providers: [StorageService],
  exports: [StorageService], // exporté pour être utilisé par ObjectsModule
})
class StorageModule {}

module.exports = { StorageModule };
