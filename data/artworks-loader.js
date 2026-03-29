(function loadArtworksJson() {
  async function load() {
    const res = await fetch('data/artworks.json', { cache: 'no-cache' });
    if (!res.ok) {
      throw new Error(`Failed to fetch artworks.json (${res.status})`);
    }
    const data = await res.json();
    window.ARTWORKS = data;
    return data;
  }

  window.ARTWORKS_READY = load();
})();
