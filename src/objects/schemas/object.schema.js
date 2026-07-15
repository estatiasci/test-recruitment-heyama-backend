const { Schema } = require('mongoose');

// Nom utilisé pour enregistrer et injecter le modèle Mongoose
const OBJECT_MODEL_NAME = 'ObjectEntity';

const ObjectSchema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },

    // URL publique de l'image stockée sur Cloudinary
    imageUrl: { type: String, required: true },

    // Clé du fichier dans le bucket, utile pour pouvoir le supprimer plus tard
    imageKey: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

module.exports = { ObjectSchema, OBJECT_MODEL_NAME };
