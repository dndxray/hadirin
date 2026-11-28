// Avatar bawaan aplikasi (ilustrasi SVG, tanpa unggah gambar).
// Yang disimpan di Firestore hanya `id` dan warna latar.
export type AvatarOption = { id: string; label: string };

export const AVATARS: AvatarOption[] = [
  { id: 'cat', label: 'Kucing' },
  { id: 'dog', label: 'Anjing' },
  { id: 'bear', label: 'Beruang' },
  { id: 'rabbit', label: 'Kelinci' },
  { id: 'fox', label: 'Rubah' },
  { id: 'panda', label: 'Panda' },
  { id: 'frog', label: 'Katak' },
  { id: 'penguin', label: 'Penguin' },
  { id: 'owl', label: 'Burung hantu' },
  { id: 'koala', label: 'Koala' },
];

export const AVATAR_COLORS = [
  '#F6D9C9', // persik
  '#DCE6FB', // biru muda
  '#D9F0E3', // mint
  '#FDE9A9', // kuning
  '#EAD9F5', // ungu muda
  '#FAD4DC', // merah muda
];

export const DEFAULT_AVATAR_COLOR = AVATAR_COLORS[0];

export function findAvatar(id?: string | null): AvatarOption | null {
  return AVATARS.find((a) => a.id === id) ?? null;
}