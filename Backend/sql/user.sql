-- =================================================================
-- Schema for public.users
-- =================================================================

-- DROP TABLE IF EXISTS public.users;

CREATE TABLE IF NOT EXISTS public.users
(
    id integer NOT NULL DEFAULT nextval('users_id_seq'::regclass),
    username character varying(50) COLLATE pg_catalog."default" NOT NULL,
    password_hash character varying(255) COLLATE pg_catalog."default" NOT NULL,
    role user_role NOT NULL DEFAULT 'user'::user_role,
    CONSTRAINT users_pkey PRIMARY KEY (id),
    CONSTRAINT users_username_key UNIQUE (username)
);

ALTER TABLE IF EXISTS public.users
    OWNER to postgres;

-- =================================================================
-- Initial Data for public.users
-- =================================================================

-- Clear existing data before inserting to prevent conflicts
TRUNCATE TABLE public.users RESTART IDENTITY CASCADE;

INSERT INTO public.users (id, username, password_hash, role) 
VALUES
(1, 'AdminOwner', '$2b$10$R7gFUMt.JggoGYnqAojAjuvVtHDvigPO/ae3T7ixcgQolYWU3zENu', 'owner');

