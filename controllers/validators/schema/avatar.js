const { username } = require('./paths');

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

const getAvatar = {
  properties: {
    query: {
      properties: {
        filter: {
          properties: {
            size: {
              enum: [16, 32, 64, 128, 256, 512]
            }
          },
          additionalProperties: false,
          required: ['size']
        }
      },
      additionalProperties: false
    },
    params: {
      properties: {
        username
      },
      required: ['username'],
      additionalProperties: false
    }
  },
  required: ['params']

};

module.exports = { patchAvatarHeaders, patchAvatarFile, getAvatar };
