/**
 * The first validation on receiving image
 *
 */
const patchAvatarHeaders = {};

/**
 * The validation after processing the file with multer library
 */
const patchAvatarFile = {
  properties: {
    file: {
      properties: {
        fieldname: { enum: ['avatar'] },
        mimetype: { enum: ['image/jpeg', 'image/png'] },
        size: { type: 'integer', maximum: 2*2**20 } // 2 MB
      },
      required: ['fieldname', 'mimetype', 'size']
    }
  },
  required: ['file']
};

module.exports = { patchAvatarHeaders, patchAvatarFile };
