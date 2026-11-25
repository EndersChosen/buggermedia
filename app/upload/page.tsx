import { redirect } from 'next/navigation';

// The old upload page now lives at /create.
export default function UploadRedirect() {
  redirect('/create');
}
