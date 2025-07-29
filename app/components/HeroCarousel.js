import React from 'react';
import { Platform } from 'react-native';

let WebCarousel = null;
if (Platform.OS === 'web') {
  WebCarousel = require('react-responsive-carousel').Carousel;
  require('react-responsive-carousel/lib/styles/carousel.min.css');
}

const HeroCarousel = () => {
  if (Platform.OS !== 'web' || !WebCarousel) {
    return null;
  }

  return (
    <div style={{ width: 250, height: 190 }}>
      <WebCarousel
        showThumbs={false}
        showStatus={false}
        infiniteLoop
        autoPlay
        interval={5000}
        emulateTouch
      >
        {[
          'https://images.pexels.com/photos/3225517/pexels-photo-3225517.jpeg?auto=compress&cs=tinysrgb&w=600',
          'https://images.pexels.com/photos/3225517/pexels-photo-3225517.jpeg?auto=compress&cs=tinysrgb&w=600',
          'https://images.pexels.com/photos/3225517/pexels-photo-3225517.jpeg?auto=compress&cs=tinysrgb&w=600',
          
        ].map((url, idx) => (
          <div key={idx}>
            <img
              src={url}
              alt={`Preview ${idx + 1}`}
              style={{
                width: '100%',
                height: '100%',
                borderRadius: 12,
                objectFit: 'cover'
              }}
            />
          </div>
        ))}
      </WebCarousel>
    </div>
  );
};

export default HeroCarousel;