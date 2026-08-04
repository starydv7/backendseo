-- Run once in Supabase Dashboard → SQL Editor

create extension if not exists "pgcrypto";

do $$ begin
  create type post_status as enum ('draft', 'scheduled', 'published');
exception
  when duplicate_object then null;
end $$;

create table if not exists authors (
  id uuid primary key default gen_random_uuid(),
  name varchar(120) not null,
  email varchar(160) not null unique,
  bio text,
  "avatarUrl" text,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name varchar(120) not null,
  slug varchar(160) not null unique,
  description text,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table if not exists tags (
  id uuid primary key default gen_random_uuid(),
  name varchar(80) not null,
  slug varchar(100) not null unique,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table if not exists blog_posts (
  id uuid primary key default gen_random_uuid(),
  title varchar(255) not null,
  slug varchar(280) not null unique,
  excerpt text,
  content text not null,
  status post_status not null default 'draft',
  "publishDate" timestamptz,
  "featuredImage" text,
  "socialSharingImage" text,
  "estimatedReadingTime" int not null default 1,
  "metaKeywords" text[],
  "metaTitle" varchar(160),
  "metaDescription" varchar(320),
  "authorId" uuid references authors(id) on delete set null,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table if not exists blog_post_categories (
  "postId" uuid not null references blog_posts(id) on delete cascade,
  "categoryId" uuid not null references categories(id) on delete cascade,
  primary key ("postId", "categoryId")
);

create table if not exists blog_post_tags (
  "postId" uuid not null references blog_posts(id) on delete cascade,
  "tagId" uuid not null references tags(id) on delete cascade,
  primary key ("postId", "tagId")
);

create table if not exists blog_post_related (
  "postId" uuid not null references blog_posts(id) on delete cascade,
  "relatedPostId" uuid not null references blog_posts(id) on delete cascade,
  primary key ("postId", "relatedPostId")
);

create table if not exists comments (
  id uuid primary key default gen_random_uuid(),
  "authorName" varchar(120) not null,
  "authorEmail" varchar(160) not null,
  content text not null,
  "isApproved" boolean not null default false,
  "postId" uuid not null references blog_posts(id) on delete cascade,
  "parentId" uuid references comments(id) on delete cascade,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

alter table authors enable row level security;
alter table categories enable row level security;
alter table tags enable row level security;
alter table blog_posts enable row level security;
alter table blog_post_categories enable row level security;
alter table blog_post_tags enable row level security;
alter table blog_post_related enable row level security;
alter table comments enable row level security;

do $$ begin
  create policy "public read published posts" on blog_posts for select using (status = 'published');
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "public read categories" on categories for select using (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "public read tags" on tags for select using (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "public read authors" on authors for select using (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "public read approved comments" on comments for select using ("isApproved" = true);
exception when duplicate_object then null;
end $$;
