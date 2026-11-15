import { Redirect, useLocalSearchParams } from 'expo-router';

// Old bookmarks remain valid, without a second form that selects another session.
export default function PermissionRedirect() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  return id
    ? <Redirect href={{ pathname: '/detail-sesi', params: { id, action: 'permission' } }} />
    : <Redirect href="/home" />;
}
