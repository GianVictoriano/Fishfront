import React, { useState } from 'react'
import Flipbook from './components/Flipbook'

const sampleArticles = [
  {
    id: 1,
    title: 'Sample Article One',
    pages: [
      '<h1>Page 1</h1><p>This is the first page of article one.</p>',
      '<h1>Page 2</h1><p>This is the second page of article one.</p>',
    ],
  },
  {
    id: 2,
    title: 'Sample Article Two',
    pages: [
      '<h1>Intro</h1><p>Welcome to article two.</p>',
      '<h1>More</h1><p>More content on page two.</p>',
      '<h1>End</h1><p>Final page.</p>',
    ],
  },
]

export default function App() {
  const [openArticle, setOpenArticle] = useState(null)

  return (
    <div className="app-root">
      <header className="header">
        <h2>Articles</h2>
      </header>

      <main className="grid">
        {sampleArticles.map((a) => (
          <article key={a.id} className="card">
            <h3>{a.title}</h3>
            <button className="btn" onClick={() => setOpenArticle(a)}>
              Read More
            </button>
          </article>
        ))}
      </main>

      {openArticle && (
        <Flipbook
          pages={openArticle.pages}
          title={openArticle.title}
          onClose={() => setOpenArticle(null)}
        />
      )}
    </div>
  )
}
