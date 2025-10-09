import React, { useRef, useEffect } from 'react'
import HTMLFlipBook from 'react-pageflip'

export default function Flipbook({ pages = [], title = '', onClose }) {
  const book = useRef(null)

  useEffect(() => {
    // lock scroll on body when modal open
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  return (
    <div className="flipback-overlay" role="dialog" aria-label={title}>
      <div className="flipback-inner">
        <button className="close-btn" onClick={onClose} aria-label="Close">
          Close
        </button>

        <div className="book-wrap">
          <HTMLFlipBook width={300} height={420} ref={book} showCover={true} mobileScrollSupport={false}>
            {pages.map((p, i) => (
              <div className="book-page" key={i} dangerouslySetInnerHTML={{ __html: p }} />
            ))}
          </HTMLFlipBook>
        </div>
      </div>
    </div>
  )
}
