"use client"

import Image from 'next/image'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export type BlogCardProps = {
  slug: string
  title: string
  excerpt: string
  author: string
  date: string
  readingMinutes?: number
  tags?: string[]
  coverImageSrc?: string
}

export function BlogCard(props: BlogCardProps) {
  const { slug, title, excerpt, author, date, readingMinutes, tags, coverImageSrc } = props
  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      {coverImageSrc && (
        <div className="relative w-full h-40">
          <Image
            src={coverImageSrc}
            alt="cover"
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            priority={false}
          />
        </div>
      )}
      <CardHeader className="gap-2">
        <CardTitle className="text-base line-clamp-2">{title}</CardTitle>
        <CardDescription className="line-clamp-2">{excerpt}</CardDescription>
      </CardHeader>
      <CardContent className="pb-6">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground/80">{author}</span>
            <span>・</span>
            <time dateTime={new Date(date).toISOString()}>{new Date(date).toLocaleDateString('ja-JP')}</time>
            {typeof readingMinutes === 'number' && (
              <>
                <span>・</span>
                <span>{readingMinutes}分</span>
              </>
            )}
          </div>
        </div>
        {tags && tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {tags.map((t) => (
              <span
                key={t}
                className="text-xs rounded-full border px-2 py-0.5 bg-muted/40 text-foreground/80"
              >
                {t}
              </span>
            ))}
          </div>
        )}
        <div className="mt-4">
          <Link href={`/blogs/${encodeURIComponent(slug)}`} className="text-sm text-primary hover:underline">
            続きを読む
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}

export default BlogCard


