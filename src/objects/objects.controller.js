const {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Bind,
  Dependencies,
  UseInterceptors,
  UploadedFile,
} = require('@nestjs/common');
const { FileInterceptor } = require('@nestjs/platform-express');
const { ObjectsService } = require('./objects.service');

@Controller('objects')
@Dependencies(ObjectsService)
class ObjectsController {
  constructor(objectsService) {
    this.objectsService = objectsService;
  }

  // POST /objects  -- multipart/form-data avec champs title, description, imgFile
  @Post()
  @UseInterceptors(FileInterceptor('imgFile'))
  // @Bind() associe les décorateurs de paramètres aux arguments de la méthode,
  // dans l'ordre : nécessaire en JS pur car les décorateurs de paramètres seuls
  // ne fonctionnent pas sans les métadonnées émises par le compilateur TS.
  @Bind(Body(), UploadedFile())
  create(createObjectDto, imgFile) {
    return this.objectsService.create(createObjectDto, imgFile);
  }

  // GET /objects
  @Get()
  findAll() {
    return this.objectsService.findAll();
  }

  // GET /objects/:id
  @Get(':id')
  @Bind(Param('id'))
  findOne(id) {
    return this.objectsService.findOne(id);
  }

  // DELETE /objects/:id
  @Delete(':id')
  @Bind(Param('id'))
  remove(id) {
    return this.objectsService.remove(id);
  }
}

module.exports = { ObjectsController };
