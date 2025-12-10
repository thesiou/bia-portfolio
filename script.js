// Portfolio Gallery Script
// Data is loaded from data/artworks.json for easy editing
// See HOW-TO-ADD-ARTWORK.md for instructions on adding new artwork

let artData = {};

// State management
let currentCategory = 'illustrations';
let currentYear = '2025';
let currentLightboxIndex = 0;
let currentFilteredItems = [];

// Load artwork data from JSON file
async function loadArtworkData() {
    try {
        const response = await fetch('data/artworks.json');
        const data = await response.json();

        // Transform data structure to match internal format
        // This converts the JSON structure to what the rest of the code expects
        Object.keys(data).forEach(category => {
            artData[category] = data[category].map(artwork => {
                // For comics, preserve the existing images array
                if (artwork.isComic && artwork.images) {
                    return {
                        ...artwork,
                        image: artwork.mainImage // For backward compatibility
                    };
                }

                // Build images array with main image first, then related images
                const images = [];

                // Add main image first
                if (artwork.mainImage) {
                    images.push({
                        url: artwork.mainImage,
                        label: "Final"
                    });
                }

                // Add related images
                if (artwork.relatedImages && artwork.relatedImages.length > 0) {
                    images.push(...artwork.relatedImages);
                }

                return {
                    ...artwork,
                    image: artwork.mainImage, // For backward compatibility
                    images: images.length > 0 ? images : undefined
                };
            });
        });

        return true;
    } catch (error) {
        console.error('Error loading artwork data:', error);
        console.log('Using fallback data. Please make sure data/artworks.json exists.');

        // Fallback to minimal data if JSON loading fails
        artData = {
            illustrations: [],
            "graphic-design": [],
            animation: [],
            comics: [],
            "concept-art": []
        };

        return false;
    }
}

// Initialize the page
document.addEventListener('DOMContentLoaded', async () => {
    // Load data first
    await loadArtworkData();

    // Then initialize everything else
    initializeEventListeners();
    renderGallery();
});

// Segmented Control Functions
function initializeSegmentedControl() {
    const checkedRadio = document.querySelector('input[name="category"]:checked');
    if (checkedRadio) {
        updateSegmentedControlSlider(checkedRadio);
    }

    // Update slider on window resize
    window.addEventListener('resize', () => {
        const checkedRadio = document.querySelector('input[name="category"]:checked');
        if (checkedRadio) {
            updateSegmentedControlSlider(checkedRadio);
        }
    });
}

function updateSegmentedControlSlider(radioElement) {
    const slider = document.getElementById('toggle-slider');
    const label = document.querySelector(`label[for="${radioElement.id}"]`);

    if (!slider || !label) return;

    // Get label dimensions and position
    const labelRect = label.getBoundingClientRect();
    const containerRect = label.parentElement.getBoundingClientRect();

    // Calculate position relative to container
    const left = labelRect.left - containerRect.left;

    // Set slider width and position
    slider.style.width = `${labelRect.width}px`;
    slider.style.transform = `translateX(${left}px)`;
}

// Event Listeners
function initializeEventListeners() {
    // Initialize segmented control slider
    initializeSegmentedControl();

    // Category toggle listeners
    const categoryRadios = document.querySelectorAll('input[name="category"]');
    categoryRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            currentCategory = e.target.value;
            updateSegmentedControlSlider(e.target);
            renderGallery();
        });
    });

    // Year filter listeners
    const yearButtons = document.querySelectorAll('.year-btn');
    yearButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            // Update active state
            yearButtons.forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');

            // Update current year and re-render
            currentYear = e.target.dataset.year;
            renderGallery();
        });
    });

    // Lightbox listeners
    const lightbox = document.getElementById('lightbox');
    const lightboxClose = document.getElementById('lightbox-close');
    const lightboxCloseLeft = document.getElementById('lightbox-close-left');
    const lightboxPrev = document.getElementById('lightbox-prev');
    const lightboxNext = document.getElementById('lightbox-next');

    lightboxClose.addEventListener('click', closeLightbox);
    lightboxCloseLeft.addEventListener('click', closeLightbox);
    lightboxPrev.addEventListener('click', () => navigateLightbox(-1));
    lightboxNext.addEventListener('click', () => navigateLightbox(1));

    // Close lightbox on background click (outside images)
    lightbox.addEventListener('click', (e) => {
        // Close if clicking on the lightbox background
        if (e.target === lightbox || e.target.classList.contains('lightbox-scroll-container')) {
            closeLightbox();
        }
    });

    // Keyboard navigation for lightbox
    document.addEventListener('keydown', (e) => {
        const lightboxActive = lightbox.classList.contains('active');
        const comicReaderActive = document.getElementById('comic-reader').classList.contains('active');

        if (lightboxActive) {
            if (e.key === 'Escape') {
                closeLightbox();
            } else if (e.key === 'ArrowLeft') {
                navigateLightbox(-1);
            } else if (e.key === 'ArrowRight') {
                navigateLightbox(1);
            }
        }

        if (comicReaderActive && e.key === 'Escape') {
            closeComicReader();
        }
    });

    // Comic reader listeners
    const comicReaderClose = document.getElementById('comic-reader-close');
    comicReaderClose.addEventListener('click', closeComicReader);
}

// Render the gallery based on current filters
function renderGallery() {
    const gallery = document.getElementById('gallery');

    // Add loading state
    gallery.classList.add('loading');

    // Small delay for smooth transition
    setTimeout(() => {
        // Get filtered items
        const categoryItems = artData[currentCategory] || [];
        currentFilteredItems = categoryItems.filter(item => item.year === currentYear);

        // Clear gallery
        gallery.innerHTML = '';

        // If no items, show message
        if (currentFilteredItems.length === 0) {
            gallery.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 4rem; color: var(--text-secondary);">
                    <p style="font-size: 1.2rem;">No items found for this period</p>
                    <p style="font-size: 0.9rem; margin-top: 1rem;">Add artwork to data/artworks.json to see it here!</p>
                </div>
            `;
            gallery.classList.remove('loading');
            return;
        }

        // Create gallery items
        currentFilteredItems.forEach((item, index) => {
            const galleryItem = createGalleryItem(item, index);
            gallery.appendChild(galleryItem);
        });

        gallery.classList.remove('loading');
    }, 150);
}

// Create a single gallery item
function createGalleryItem(item, index) {
    const div = document.createElement('div');
    div.className = 'gallery-item';
    div.innerHTML = `
        <img src="${item.image}" alt="${item.title}" class="gallery-item-image">
        <div class="gallery-item-info">
            <h3 class="gallery-item-title">${item.title}</h3>
            <p class="gallery-item-description">${item.description}</p>
        </div>
    `;

    // Add click listener - open comic reader for comics, lightbox for others
    if (item.isComic) {
        div.addEventListener('click', () => openComicReader(item));
    } else {
        div.addEventListener('click', () => openLightbox(index));
    }

    return div;
}

// Enhanced Lightbox functions
function openLightbox(index) {
    currentLightboxIndex = index;
    const item = currentFilteredItems[index];

    populateLightbox(item);

    const lightbox = document.getElementById('lightbox');
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Scroll to top of modal
    const scrollContainer = document.querySelector('.lightbox-scroll-container');
    if (scrollContainer) {
        scrollContainer.scrollTop = 0;
    }
}

function populateLightbox(item) {
    // Main image
    const lightboxImg = document.getElementById('lightbox-img');
    lightboxImg.src = item.image;
    lightboxImg.alt = item.title;

    // Title and description
    document.getElementById('lightbox-title').textContent = item.title;
    document.getElementById('lightbox-full-description').textContent =
        item.fullDescription || item.description;

    // Metadata
    populateMetadata(item);

    // Tags
    populateTags(item.tags);

    // Related images
    populateRelatedImages(item.images);
}

function populateMetadata(item) {
    // Software pills - top right
    const softwarePillContainer = document.getElementById('lightbox-software-pill');
    softwarePillContainer.innerHTML = '';

    if (item.software && item.software.length > 0) {
        item.software.forEach(software => {
            const badge = document.createElement('span');
            badge.className = 'software-badge';
            badge.textContent = software;
            softwarePillContainer.appendChild(badge);
        });
    }

    // Hide old metadata sections
    const softwareSection = document.getElementById('software-section');
    const timeSection = document.getElementById('time-section');
    const dimensionsSection = document.getElementById('dimensions-section');

    softwareSection.style.display = 'none';
    timeSection.style.display = 'none';
    dimensionsSection.style.display = 'none';
}

function populateTags(tags) {
    // Hide tags section
    const tagsContainer = document.getElementById('lightbox-tags');
    tagsContainer.style.display = 'none';
}

function populateRelatedImages(images) {
    const relatedContainer = document.getElementById('related-images');
    relatedContainer.innerHTML = '';

    if (images && images.length > 1) {
        // Show all images except the first (which is the main image)
        images.slice(1).forEach((img) => {
            const relatedItem = document.createElement('div');
            relatedItem.className = 'related-image-item';
            relatedItem.innerHTML = `
                <img src="${img.url}" alt="${img.label}">
            `;

            relatedContainer.appendChild(relatedItem);
        });
    }
}

function closeLightbox() {
    const lightbox = document.getElementById('lightbox');
    lightbox.classList.remove('active');
    document.body.style.overflow = ''; // Restore scrolling
}

function navigateLightbox(direction) {
    currentLightboxIndex += direction;

    // Wrap around
    if (currentLightboxIndex < 0) {
        currentLightboxIndex = currentFilteredItems.length - 1;
    } else if (currentLightboxIndex >= currentFilteredItems.length) {
        currentLightboxIndex = 0;
    }

    const item = currentFilteredItems[currentLightboxIndex];

    // Fade out
    const content = document.querySelector('.lightbox-content');
    content.style.opacity = '0';

    setTimeout(() => {
        populateLightbox(item);
        content.style.opacity = '1';

        // Scroll to top
        const scrollContainer = document.querySelector('.lightbox-scroll-container');
        if (scrollContainer) {
            scrollContainer.scrollTop = 0;
        }
    }, 150);
}

// Comic Reader functions
let lastScrollTop = 0;

function openComicReader(item) {
    const comicReader = document.getElementById('comic-reader');
    const comicReaderTitle = document.getElementById('comic-reader-title');
    const comicReaderContent = document.getElementById('comic-reader-content');
    const comicPageCounter = document.getElementById('comic-page-counter');
    const comicHeader = document.getElementById('comic-reader-header');
    const scrollToTopBtn = document.getElementById('comic-scroll-to-top');

    // Set title
    comicReaderTitle.textContent = item.title;

    // Clear content
    comicReaderContent.innerHTML = '';

    // Get all comic pages from images array
    const pages = item.images || [];

    // Update page counter
    comicPageCounter.textContent = `${pages.length} ${pages.length === 1 ? 'Page' : 'Pages'}`;

    // Add all pages vertically
    pages.forEach((page, index) => {
        const img = document.createElement('img');
        img.src = page.url;
        img.alt = `${item.title} - Page ${index + 1}`;
        img.className = 'comic-page';
        comicReaderContent.appendChild(img);
    });

    // Show comic reader
    comicReader.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Reset header and button states
    comicHeader.classList.remove('hidden');
    scrollToTopBtn.classList.remove('visible');
    lastScrollTop = 0;

    // Scroll to top
    comicReaderContent.scrollTop = 0;

    // Add scroll listener for auto-hide header and scroll-to-top button
    comicReaderContent.addEventListener('scroll', handleComicScroll);

    // Add click listener to scroll-to-top button
    scrollToTopBtn.addEventListener('click', scrollComicToTop);
}

function handleComicScroll() {
    const comicReaderContent = document.getElementById('comic-reader-content');
    const comicHeader = document.getElementById('comic-reader-header');
    const scrollToTopBtn = document.getElementById('comic-scroll-to-top');
    const scrollTop = comicReaderContent.scrollTop;

    // Auto-hide header on scroll down, show on scroll up
    if (scrollTop > lastScrollTop && scrollTop > 100) {
        // Scrolling down
        comicHeader.classList.add('hidden');
        comicReaderContent.classList.add('header-hidden');
    } else {
        // Scrolling up
        comicHeader.classList.remove('hidden');
        comicReaderContent.classList.remove('header-hidden');
    }

    lastScrollTop = scrollTop;

    // Show scroll-to-top button after scrolling down 500px
    if (scrollTop > 500) {
        scrollToTopBtn.classList.add('visible');
    } else {
        scrollToTopBtn.classList.remove('visible');
    }
}

function scrollComicToTop() {
    const comicReaderContent = document.getElementById('comic-reader-content');
    comicReaderContent.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

function closeComicReader() {
    const comicReader = document.getElementById('comic-reader');
    const comicReaderContent = document.getElementById('comic-reader-content');
    const scrollToTopBtn = document.getElementById('comic-scroll-to-top');

    // Remove scroll listener
    comicReaderContent.removeEventListener('scroll', handleComicScroll);
    scrollToTopBtn.removeEventListener('click', scrollComicToTop);

    comicReader.classList.remove('active');
    document.body.style.overflow = '';
}
