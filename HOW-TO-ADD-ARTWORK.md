# How to Add New Artwork to Your Portfolio

This guide shows you exactly how to add new artwork to your portfolio website.

## Quick Start (3 Steps)

### Step 1: Add Your Images

Put your artwork images in the correct folder:

- **Illustrations** → `images/illustrations/`
- **Graphic Design** → `images/graphic-design/`
- **Animation** → `images/animation/`

**Naming tips:**
- Use descriptive names: `forest-landscape-final.jpg` instead of `img001.jpg`
- No spaces in filenames! Use dashes: `my-artwork.jpg` ✓ not `my artwork.jpg` ✗
- Supported formats: `.jpg`, `.png`, `.webp`, `.gif`

**Example:**
```
images/illustrations/dragon-character-final.jpg
images/illustrations/dragon-character-sketch.jpg
images/illustrations/dragon-character-colors.jpg
```

---

### Step 2: Edit the Data File

1. Open `data/artworks.json`
2. Find the category you want (illustrations, graphic-design, or animation)
3. Copy this template and paste it into the array:

```json
{
  "id": 999,
  "title": "Your Artwork Title",
  "description": "Short description for gallery preview",
  "year": "2025",
  "mainImage": "images/illustrations/your-artwork.jpg",
  "relatedImages": []
}
```

4. Update the fields with your information
5. **Important:** Change the `id` to a unique number (make sure no other artwork has this number)
6. Save the file

---

### Step 3: Refresh Your Browser

That's it! Open `index.html` in your browser and your new artwork should appear.

---

## Detailed Example

Here's a complete example with all optional fields:

```json
{
  "id": 5,
  "title": "Dragon Guardian",
  "description": "Fantasy character illustration with detailed armor and scales",
  "fullDescription": "This piece was inspired by medieval fantasy and Eastern dragon mythology. I wanted to create a character that felt both powerful and elegant. The armor design took several iterations to get right.",
  "year": "2025",
  "mainImage": "images/illustrations/dragon-guardian-final.jpg",
  "relatedImages": [
    {
      "url": "images/illustrations/dragon-guardian-sketch.jpg",
      "label": "Initial Sketch"
    },
    {
      "url": "images/illustrations/dragon-guardian-lineart.jpg",
      "label": "Clean Lineart"
    },
    {
      "url": "images/illustrations/dragon-guardian-colors.jpg",
      "label": "Flat Colors"
    }
  ],
  "software": ["Clip Studio Paint", "Photoshop"],
  "timeSpent": "15 hours",
  "dimensions": "4000 x 5000 px",
  "tags": ["fantasy", "character design", "dragon", "digital painting"]
}
```

---

## Field Reference

### Required Fields (Must Include)

| Field | What it is | Example |
|-------|-----------|---------|
| `id` | Unique number for this artwork | `5` |
| `title` | Name of your artwork | `"Dragon Guardian"` |
| `description` | Short preview text (shown in gallery) | `"Fantasy character illustration"` |
| `year` | When created - must be "2025", "2024", or "2023" | `"2025"` |
| `mainImage` | Path to your main image | `"images/illustrations/dragon.jpg"` |

### Optional Fields (Can Skip)

| Field | What it is | Example |
|-------|-----------|---------|
| `fullDescription` | Longer description shown in modal | `"This piece was inspired by..."` |
| `relatedImages` | Progress/sketch images | See example above |
| `software` | Programs you used | `["Photoshop", "Procreate"]` |
| `timeSpent` | How long it took | `"10 hours"` |
| `dimensions` | Image size | `"3000 x 4000 px"` |
| `tags` | Keywords for your art | `["fantasy", "digital"]` |

**Note:** If you skip optional fields, just leave them out completely. Or set them to empty arrays `[]` or empty strings `""`.

---

## Minimal Example (Just the Basics)

If you just want to add artwork quickly without all the details:

```json
{
  "id": 6,
  "title": "Forest Scene",
  "description": "Peaceful forest landscape",
  "year": "2025",
  "mainImage": "images/illustrations/forest.jpg",
  "relatedImages": []
}
```

This is perfectly fine! You can always add more details later.

---

## Common Mistakes to Avoid

❌ **Forgetting commas between items**
```json
{
  "id": 1,
  "title": "Art 1"
}  <-- Missing comma here!
{
  "id": 2,
  "title": "Art 2"
}
```

✓ **Correct:**
```json
{
  "id": 1,
  "title": "Art 1"
},
{
  "id": 2,
  "title": "Art 2"
}
```

---

❌ **Using the same ID twice**
```json
{ "id": 1, "title": "Art A" },
{ "id": 1, "title": "Art B" }  <-- Same ID!
```

✓ **Correct:**
```json
{ "id": 1, "title": "Art A" },
{ "id": 2, "title": "Art B" }
```

---

❌ **Wrong year format**
```json
"year": "2024-2025"  <-- Old format!
```

✓ **Correct:**
```json
"year": "2025"
```

---

❌ **Spaces in filenames**
```json
"mainImage": "images/illustrations/my artwork.jpg"
```

✓ **Correct:**
```json
"mainImage": "images/illustrations/my-artwork.jpg"
```

---

## Where to Add Your Entry

Open `data/artworks.json` and find the right section:

**For Illustrations:**
```json
{
  "illustrations": [
    { existing artwork... },
    { existing artwork... },
    { YOUR NEW ARTWORK HERE }  <-- Add here
  ],
  ...
}
```

**For Graphic Design:**
```json
{
  "illustrations": [...],
  "graphic-design": [
    { existing artwork... },
    { YOUR NEW ARTWORK HERE }  <-- Add here
  ],
  ...
}
```

**For Animation:**
```json
{
  "illustrations": [...],
  "graphic-design": [...],
  "animation": [
    { existing artwork... },
    { YOUR NEW ARTWORK HERE }  <-- Add here
  ]
}
```

---

## Tips for Best Results

### Image Quality
- Use high-resolution images (at least 2000px on the longest side)
- Export at good quality (JPEG at 80-90% quality is fine)
- WebP format is recommended for smaller file sizes

### Related Images (Progress Shots)
These show up below the main image when someone clicks on your artwork:
- Sketches
- Line art stages
- Color blocking
- Work-in-progress shots
- Alternative versions

### Descriptions
- **Short description:** 1-2 sentences, appears in gallery
- **Full description:** Tell the story! What inspired you? What challenges did you face? What techniques did you use?

### Tags
Use keywords that describe your art:
- Medium: `"digital art"`, `"traditional"`, `"3D"`
- Subject: `"portrait"`, `"landscape"`, `"character design"`
- Style: `"realistic"`, `"anime"`, `"painterly"`
- Other: `"commission"`, `"personal work"`, `"fan art"`

---

## Need Help?

Check the template file at `data/TEMPLATE-artwork.json` for more examples!

If something's not working, check the browser console (F12) for error messages.
