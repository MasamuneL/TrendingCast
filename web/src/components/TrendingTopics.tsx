import { useState, useEffect } from 'react'
import { fetchTrendingTopics, type TrendingTopic } from '../lib/api'

const CATEGORIES = ['All', 'Gaming', 'IRL', 'Music', 'Art', 'Tech', 'Sports']

function TopicCard({ topic }: { topic: TrendingTopic }) {
  return (
    <div className="card flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-sm">{topic.title}</h3>
        <span className="badge bg-brand-900 text-brand-100 shrink-0">
          #{Math.round(topic.score)}
        </span>
      </div>
      <p className="text-gray-400 text-xs">
        Best time to stream:{' '}
        <span className="text-white font-medium">{topic.bestStreamHour}:00</span>
      </p>
      <div className="flex flex-wrap gap-1">
        {topic.tags.map((tag) => (
          <span key={tag} className="badge bg-gray-800 text-gray-300">
            {tag}
          </span>
        ))}
      </div>
    </div>
  )
}

export default function TrendingTopics() {
  const [topics, setTopics] = useState<TrendingTopic[]>([])
  const [category, setCategory] = useState('All')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetchTrendingTopics(category === 'All' ? undefined : category)
      .then(setTopics)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [category])

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-semibold">Trending Topics</h2>
        <div className="flex gap-1 flex-wrap">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                category === c
                  ? 'bg-brand-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card animate-pulse h-32 bg-gray-800" />
          ))}
        </div>
      )}

      {error && (
        <div className="card border-red-800 text-red-400 text-sm">{error}</div>
      )}

      {!loading && !error && topics.length === 0 && (
        <div className="card text-gray-400 text-sm text-center py-10">
          No trending topics found for this category.
        </div>
      )}

      {!loading && !error && topics.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {topics.map((t) => (
            <TopicCard key={t.id} topic={t} />
          ))}
        </div>
      )}
    </section>
  )
}
