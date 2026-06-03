-- Drop tables if they exist (for a clean slate, careful if running on prod!)
-- DROP TABLE IF EXISTS notifications;
-- DROP TABLE IF EXISTS people;

-- Ensure UUID extension is available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- People Table
CREATE TABLE IF NOT EXISTS people (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    birthday DATE,
    photo TEXT,
    relationship_type TEXT,
    pronouns TEXT,
    status TEXT,
    strength_score INT DEFAULT 50,
    trust_score INT DEFAULT 50,
    is_archived BOOLEAN DEFAULT FALSE,
    linked_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Set up Row Level Security (RLS) for people
ALTER TABLE people ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own people" ON people FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own people" ON people FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own people" ON people FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own people" ON people FOR DELETE USING (auth.uid() = user_id);

-- Set up Row Level Security (RLS) for notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own notifications" ON notifications FOR DELETE USING (auth.uid() = user_id);

-- Push Subscriptions Table
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, endpoint)
);

-- Set up Row Level Security (RLS) for push_subscriptions
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable ALL for users based on user_id" ON push_subscriptions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Interactions Table (Timeline)
CREATE TABLE IF NOT EXISTS interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    person_id UUID REFERENCES people(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- e.g., 'call', 'meet', 'text', 'gift'
    notes TEXT,
    sentiment TEXT, -- 'positive', 'neutral', 'negative'
    interaction_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tags Table (Free-form)
CREATE TABLE IF NOT EXISTS tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, name)
);

-- Person-Tags Join Table
CREATE TABLE IF NOT EXISTS person_tags (
    person_id UUID REFERENCES people(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (person_id, tag_id)
);

-- Connections Table (Graph)
CREATE TABLE IF NOT EXISTS connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    person_a_id UUID REFERENCES people(id) ON DELETE CASCADE,
    person_b_id UUID REFERENCES people(id) ON DELETE CASCADE,
    connection_type TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(person_a_id, person_b_id)
);

-- Set up RLS for new tables
ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their interactions" ON interactions FOR ALL USING (auth.uid() = user_id);

ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their tags" ON tags FOR ALL USING (auth.uid() = user_id);

ALTER TABLE person_tags ENABLE ROW LEVEL SECURITY;
-- For join table, we rely on the person_id which belongs to the user, but we'll keep it simple for MVP
CREATE POLICY "Users can manage their person_tags" ON person_tags FOR ALL USING (
    EXISTS (SELECT 1 FROM people WHERE people.id = person_tags.person_id AND people.user_id = auth.uid())
);

ALTER TABLE connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their connections" ON connections FOR ALL USING (auth.uid() = user_id);

-- PHASE 5: Contact Info & Storage

-- Add Contact Info to People
ALTER TABLE people 
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS address TEXT;

-- Create Storage Bucket for Avatars
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies
CREATE POLICY "Avatar images are publicly accessible." ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Anyone can upload an avatar." ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Anyone can update an avatar." ON storage.objects
FOR UPDATE WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Anyone can delete an avatar." ON storage.objects
FOR DELETE USING (bucket_id = 'avatars');

-- PHASE 5 Fix: Reminders Table (was missing)
CREATE TABLE IF NOT EXISTS reminders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    person_id UUID REFERENCES people(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
    is_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their reminders" ON reminders FOR ALL USING (auth.uid() = user_id);

-- PHASE 6: Social Identity Layer

-- Profiles Table (Publicly searchable handles)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    handle TEXT UNIQUE,
    avatar_url TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are publicly viewable" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Link Requests Table
CREATE TABLE IF NOT EXISTS link_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    receiver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    relationship_type TEXT,
    status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'rejected'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(sender_id, receiver_id)
);

ALTER TABLE link_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view link requests sent to or by them" ON link_requests FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "Users can send link requests" ON link_requests FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Users can update link requests sent to them" ON link_requests FOR UPDATE USING (auth.uid() = receiver_id OR auth.uid() = sender_id);
CREATE POLICY "Users can delete their own requests" ON link_requests FOR DELETE USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Verified Links Table (The Multiplayer Social Graph)
CREATE TABLE IF NOT EXISTS verified_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_a UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    user_b UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    relationship_type TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_a, user_b)
);

ALTER TABLE verified_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own verified links" ON verified_links FOR SELECT USING (auth.uid() = user_a OR auth.uid() = user_b);
CREATE POLICY "System can manage verified links" ON verified_links FOR ALL USING (auth.uid() = user_a OR auth.uid() = user_b);
