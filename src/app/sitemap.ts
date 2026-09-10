import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://sharedjournal.com',
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: 'https://sharedjournal.com/privacy',
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: 'https://sharedjournal.com/terms',
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: 'https://sharedjournal.com/legal',
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: 'https://sharedjournal.com/buy-me-coffee',
      changeFrequency: 'monthly',
      priority: 0.3,
    },
  ]
}
