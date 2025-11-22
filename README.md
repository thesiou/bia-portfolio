# Art Portfolio Website

A beautiful, minimalist dark-themed portfolio website with glassmorphism effects.

## Features

- Three-way toggle switch for categories (Illustrations, Graphic Design, Animation)
- Year-based filtering (2025, 2024, 2023)
- Responsive grid gallery layout
- Lightbox modal for viewing artwork
- Keyboard navigation support
- Smooth animations and transitions
- Glassmorphism UI elements

## File Structure

```
Porfolio/
├── index.html          # Main HTML file
├── styles.css          # All styling and animations
├── script.js           # Gallery logic and interactions
├── images/             # Image assets folder
│   ├── illustrations/  # Illustration artwork
│   ├── graphic-design/ # Graphic design work
│   └── animation/      # Animation projects
└── README.md          # This file
```

## How to Add Your Artwork

### Step 1: Add Images to Folders

Place your images in the appropriate category folder:
- `images/illustrations/` - for illustration work
- `images/graphic-design/` - for graphic design projects
- `images/animation/` - for animation projects

**Supported formats:** JPG, PNG, WebP, GIF

### Step 2: Update script.js

Open `script.js` and find the `artData` object. Add your artwork entries:

```javascript
{
    id: 1,
    title: "Your Artwork Title",
    description: "A brief description of your work",
    year: "2025",  // Choose: "2025", "2024", or "2023"
    image: "images/illustrations/your-image.jpg"
}
```

### Example

```javascript
illustrations: [
    {
        id: 1,
        title: "Forest Dreams",
        description: "Digital illustration exploring nature themes",
        year: "2025",
        image: "images/illustrations/forest-dreams.jpg"
    },
    {
        id: 2,
        title: "Urban Sketches",
        description: "City life captured in line art",
        year: "2025",
        image: "images/illustrations/urban-sketches.png"
    }
]
```

## Customization

### Change Colors

Edit the CSS variables in `styles.css` (lines 8-17):

```css
:root {
    --bg-primary: #0a0a0a;        /* Main background */
    --bg-secondary: #161616;      /* Card backgrounds */
    --text-primary: #ffffff;      /* Main text color */
    --text-secondary: #a0a0a0;    /* Secondary text */
    --accent: #ffffff;            /* Accent color */
}
```

### Modify Year Options

To change the year filter buttons, edit both `index.html` and `script.js`:

**In index.html:**
```html
<button class="year-btn active" data-year="2026">2026</button>
```

**In script.js:**
Update the `year` field in your artwork entries to match.

### Change Site Title

Edit `index.html` line 7 and line 18:
```html
<title>Your Name - Portfolio</title>
...
<h1 class="site-title">Your Name</h1>
```

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile responsive
- Supports backdrop-filter for glassmorphism effects

## Tips

- Use consistent image dimensions for best results
- Optimize images for web (use WebP format for smaller file sizes)
- Keep descriptions concise (1-2 sentences)
- Images load with lazy loading for better performance

## Credits

Built with vanilla HTML, CSS, and JavaScript.
