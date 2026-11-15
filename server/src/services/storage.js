const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const env = require('../config/env');

/**
 * File storage. Uses Cloudinary when CLOUDINARY_URL is set (production) and the local disk
 * otherwise. Files are never public: the API hands out short-lived signed links after
 * checking that the requester is logged in.
 */
let cloudinary = null;
if (env.cloudinaryUrl) {
  cloudinary = require('cloudinary').v2;
  cloudinary.config({ secure: true }); // reads CLOUDINARY_URL
}

const SIGNED_URL_TTL_SECONDS = 5 * 60;

async function save(file) {
  const ext = file.format;
  if (cloudinary) {
    const resourceType = ext === 'png' || ext === 'jpg' ? 'image' : 'raw';
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: env.cloudinaryFolder, resource_type: resourceType, type: 'authenticated', use_filename: false },
        (err, res) => (err ? reject(err) : resolve(res)),
      );
      stream.end(file.buffer);
    });
    return { provider: 'cloudinary', key: `${resourceType}:${result.public_id}` };
  }
  await fs.mkdir(env.uploadDir, { recursive: true });
  const key = `${crypto.randomBytes(16).toString('hex')}.${ext}`;
  await fs.writeFile(path.join(env.uploadDir, key), file.buffer, { mode: 0o600 });
  return { provider: 'local', key };
}

async function remove(fileInfo) {
  if (!fileInfo?.key) return;
  try {
    if (fileInfo.provider === 'cloudinary' && cloudinary) {
      const [resourceType, publicId] = fileInfo.key.split(/:(.+)/);
      await cloudinary.uploader.destroy(publicId, { resource_type: resourceType, type: 'authenticated' });
    } else if (fileInfo.provider === 'local') {
      await fs.unlink(path.join(env.uploadDir, path.basename(fileInfo.key)));
    }
  } catch {
    // Best effort: a missing file should not block deleting the database record.
  }
}

/** Returns a short-lived URL. `disposition` is "attachment" for downloads or "inline" for previews. */
function signedUrl(fileInfo, { filename, disposition = 'attachment', apiBase = '' }) {
  if (fileInfo.provider === 'cloudinary' && cloudinary) {
    const [resourceType, publicId] = fileInfo.key.split(/:(.+)/);
    return cloudinary.utils.private_download_url(publicId, resourceType === 'raw' ? '' : fileInfo.format, {
      resource_type: resourceType,
      type: 'authenticated',
      expires_at: Math.floor(Date.now() / 1000) + SIGNED_URL_TTL_SECONDS,
      attachment: disposition === 'attachment',
    });
  }
  const token = jwt.sign({ k: fileInfo.key, f: fileInfo.format, n: filename, d: disposition }, env.fileUrlSecret, {
    expiresIn: SIGNED_URL_TTL_SECONDS,
  });
  return `${apiBase}/api/files/${token}`;
}

function verifyLocalToken(token) {
  return jwt.verify(token, env.fileUrlSecret);
}

const localPath = (key) => path.join(env.uploadDir, path.basename(key));

module.exports = { save, remove, signedUrl, verifyLocalToken, localPath, SIGNED_URL_TTL_SECONDS };
