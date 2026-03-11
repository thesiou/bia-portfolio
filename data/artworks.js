// Portfolio data — edit this file to manage categories and pieces.
// First piece in each category's pieces[] is the HERO (large left panel).
// Remaining pieces fill the supporting grid (up to 3).
window.ARTWORKS = {
  featuredImage: "images/loop_no_explo.mp4",
  categories: [
    {
      id: "characters",
      title: "Characters",
      pieces: [
        {
          title: "",
          year: "",
          software: ["Clip Studio Paint"],
          mainImage: "images/characters/1.jpeg",
          description: "",
          detailImages: []
        },
        {
          title: "",
          year: "",
          software: ["Clip Studio Paint"],
          mainImage: "images/characters/2.jpeg",
          description: "",
          detailImages: []
        },
        {
          title: "",
          year: "",
          software: ["Clip Studio Paint"],
          mainImage: "images/characters/3.jpeg",
          description: "",
          detailImages: []
        },
        {
          title: "",
          year: "",
          software: ["Clip Studio Paint"],
          mainImage: "images/characters/4.jpeg",
          description: "",
          detailImages: []
        },
        {
          title: "",
          year: "",
          software: ["Clip Studio Paint"],
          mainImage: "images/characters/5.jpeg",
          description: "",
          detailImages: []
        }
      ]
    },
    {
      id: "animation",
      title: "Animation",
      featuredVideo: "images/animation/animation1.mp4",
      featuredDetailVideo: "images/animation/animation1-detail/bakugo_s_room_TL.mp4",
      gridLayout: "2x2",
      pieces: [
        {
          title: "",
          year: "",
          software: ["Clip Studio Paint"],
          mainImage: "images/animation/animation1.mp4",
          description: "",
          detailImages: [
            { src: "images/animation/animation1-detail/roomfinalsketch.jpeg", caption: "" },
            { src: "images/animation/animation1-detail/conceptdesign.jpeg",  caption: "Concept Design" },
            { src: "images/animation/animation1-detail/storyboard.jpeg",     caption: "Storyboard" },
            { src: "images/animation/animation1-detail/roomdetail.gif",      caption: "" },
            { src: "images/animation/animation1-detail/timelapse.mp4",       caption: "Timelapse" }
          ]
        },
        {
          title: "",
          year: "",
          software: ["Clip Studio Paint"],
          mainImage: "images/animation/animation2.mp4",
          description: "",
          detailImages: [
            { src: "images/animation/animation2-detail.mp4", caption: "" }
          ]
        },
        {
          title: "",
          year: "",
          software: ["Clip Studio Paint"],
          mainImage: "images/animation/animation3.mp4",
          description: "",
          detailImages: []
        },
        {
          title: "",
          year: "",
          software: ["Clip Studio Paint"],
          mainImage: "images/animation/animation4.gif",
          description: "",
          detailImages: []
        },
        {
          title: "",
          year: "",
          software: ["Clip Studio Paint"],
          mainImage: "images/animation/animation5.gif",
          description: "",
          detailImages: []
        }
      ]
    },
    {
      id: "illustration",
      title: "Illustration",
      gridLayout: "portrait-hero",
      pieces: [
        {
          title: "",
          year: "",
          software: ["Clip Studio Paint"],
          mainImage: "images/illustration/3.jpeg",
          description: "",
          detailImages: [
            { src: "images/illustration/3-detail/kitchencomp_sketch.jpeg",   caption: "Composition sketch" },
            { src: "images/illustration/3-detail/kitchencomp_sketch_2.jpeg", caption: "" },
            { src: "images/illustration/3-detail/kitchennochars.jpeg",       caption: "Background" },
            { src: "images/illustration/3-detail/kitchennochars2.jpeg",      caption: "" },
            { src: "images/illustration/3-detail/kitchen3.jpeg",             caption: "" }
          ]
        },
        {
          title: "",
          year: "",
          software: ["Clip Studio Paint"],
          mainImage: "images/illustration/1.jpeg",
          description: "",
          detailImages: [
            { src: "images/illustration/1-detail/11.02sk.jpeg",       caption: "Sketch" },
            { src: "images/illustration/1-detail/11.02sklight2.jpeg", caption: "" },
            { src: "images/illustration/1-detail/11.02sklight3.jpeg", caption: "" },
            { src: "images/illustration/1-detail/13022026TL.mp4",     caption: "Timelapse" }
          ]
        },
        {
          title: "",
          year: "",
          software: ["Clip Studio Paint"],
          mainImage: "images/illustration/2.jpeg",
          description: "",
          detailImages: []
        }
      ]
    },
    {
      id: "other",
      title: "Other Fun Stuff",
      subcategories: [
        {
          id: "concepts",
          title: "Concepts",
          preview: "images/otherfunstuff/concepts/concept1.png",
          pieces: [
            "images/otherfunstuff/concepts/concept1.png",
            "images/otherfunstuff/concepts/shop1.jpg",
            "images/otherfunstuff/concepts/shop2.jpg",
            "images/otherfunstuff/concepts/shop3.jpg"
          ]
        },
        {
          id: "storyboards-comics",
          title: "Storyboards & Comics",
          preview: "images/otherfunstuff/storyboards:comics/comics1.jpg",
          pieces: [
            "images/otherfunstuff/storyboards:comics/storyboard1.jpeg",
            "images/otherfunstuff/storyboards:comics/storyboard2.jpg",
            "images/otherfunstuff/storyboards:comics/comics1.jpg",
            "images/otherfunstuff/storyboards:comics/comics2.jpeg",
            "images/otherfunstuff/storyboards:comics/comics3.jpeg"
          ]
        },
        {
          id: "sketchbook",
          title: "Sketchbook",
          preview: "images/otherfunstuff/sketchbook/sketch-8.jpg",
          pieces: [
            "images/otherfunstuff/sketchbook/sketch-1.jpeg",
            "images/otherfunstuff/sketchbook/sketch-2.jpeg",
            "images/otherfunstuff/sketchbook/sketch-3.jpg",
            "images/otherfunstuff/sketchbook/sketch-4.jpg",
            "images/otherfunstuff/sketchbook/sketch-5.jpeg",
            "images/otherfunstuff/sketchbook/sketch-6.jpg",
            "images/otherfunstuff/sketchbook/sketch-7.jpg",
            "images/otherfunstuff/sketchbook/sketch-8.jpg",
            "images/otherfunstuff/sketchbook/sketch-9.jpg",
            "images/otherfunstuff/sketchbook/sketch-10.jpg",
            "images/otherfunstuff/sketchbook/sketch-11.jpg",
            "images/otherfunstuff/sketchbook/sketch-12.jpeg",
            "images/otherfunstuff/sketchbook/sketch-13.jpeg",
            "images/otherfunstuff/sketchbook/sketch-14.jpeg",
            "images/otherfunstuff/sketchbook/sketch-15.jpeg"
          ]
        },
        {
          id: "3d",
          title: "3D",
          externalLink: "https://www.artstation.com/artwork/v1dBWO",
          preview: "images/otherfunstuff/3D/3d-1.jpg"
        }
      ]
    }
  ]
};
