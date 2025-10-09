import React, { createContext, useContext, useState } from 'react';

const ArticleContext = createContext();

export function ArticleProvider({ children }) {
  const [readArticles, setReadArticles] = useState([]);

  const markAsRead = (article) => {
    const alreadyRead = readArticles.find((a) => a.id === article.id);

    if (!alreadyRead) {
      const withTimestamp = {
        ...article,
        readAt: new Date().toISOString(), // store timestamp
      };
      setReadArticles((prev) => [...prev, withTimestamp]);
    }
  };

  return (
    <ArticleContext.Provider value={{ readArticles, markAsRead }}>
      {children}
    </ArticleContext.Provider>
  );
}

export function useArticles() {
  return useContext(ArticleContext);
}
