import { useEffect, useState } from 'react';

export function useHashRoute(): [string, (r: string) => void] {
  const get = () => window.location.hash.replace(/^#/, '') || '/';
  const [route, setRoute] = useState(get);

  useEffect(() => {
    const onChange = () => setRoute(get());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  const navigate = (r: string) => {
    window.location.hash = r;
  };
  return [route, navigate];
}
