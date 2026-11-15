import { get } from '../api/client';

/** Asks the API for a short-lived signed link and starts the download. */
export async function downloadResource(id) {
  const { url } = await get(`/resources/${id}/file`, { disposition: 'attachment' });
  const a = document.createElement('a');
  a.href = url;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
}
