const PINATA_JWT = import.meta.env.VITE_PINATA_JWT as string | undefined;

export async function uploadToIPFS(content: string): Promise<string> {
  if (!PINATA_JWT) throw new Error('VITE_PINATA_JWT no está configurado en el .env');

  const blob = new Blob([content], { type: 'text/plain' });
  const formData = new FormData();
  formData.append('file', blob, 'deliverable.txt');
  formData.append('pinataMetadata', JSON.stringify({ name: `deliverable-${Date.now()}` }));
  formData.append('pinataOptions', JSON.stringify({ cidVersion: 0 }));

  const res = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
    method: 'POST',
    headers: { Authorization: `Bearer ${PINATA_JWT}` },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Pinata error: ${err}`);
  }

  const data = (await res.json()) as { IpfsHash: string };
  return data.IpfsHash;
}

export async function fetchFromIPFS(cid: string): Promise<string> {
  const url = `https://gateway.pinata.cloud/ipfs/${cid}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`No se pudo obtener el contenido de IPFS (${res.status})`);
  return res.text();
}

export function ipfsGatewayUrl(cid: string): string {
  return `https://gateway.pinata.cloud/ipfs/${cid}`;
}

// CID local cache — provider stores it after upload so the evaluator
// can access it in the same browser session. Cross-browser access is via
// the public IPFS gateway using the CID shown to the provider.
export function cacheCID(jobId: bigint, cid: string) {
  localStorage.setItem(`ipfs_cid_${jobId}`, cid);
}

export function getCachedCID(jobId: bigint): string | null {
  return localStorage.getItem(`ipfs_cid_${jobId}`);
}
