import { Redirect } from 'expo-router';

// Preserve existing links while all participation actions now live in a session.
export default function PresensiRedirect() {
  return <Redirect href="/home" />;
}
