-- Table: public.lotto_round_exemptions

-- DROP TABLE IF EXISTS public.lotto_round_exemptions;

CREATE TABLE IF NOT EXISTS public.lotto_round_exemptions
(
    id integer NOT NULL DEFAULT nextval('lotto_round_exemptions_id_seq'::regclass),
    lotto_round_id integer NOT NULL,
    exemption_type exemption_type NOT NULL,
    user_id integer,
    user_role user_role,
    CONSTRAINT lotto_round_exemptions_pkey PRIMARY KEY (id),
    CONSTRAINT lotto_round_exemptions_lotto_round_id_fkey FOREIGN KEY (lotto_round_id)
        REFERENCES public.lotto_rounds (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE,
    CONSTRAINT lotto_round_exemptions_user_id_fkey FOREIGN KEY (user_id)
        REFERENCES public.users (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE,
    CONSTRAINT user_or_role_exemption CHECK (exemption_type = 'user'::exemption_type AND user_id IS NOT NULL AND user_role IS NULL OR exemption_type = 'role'::exemption_type AND user_role IS NOT NULL AND user_id IS NULL)
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.lotto_round_exemptions
    OWNER to maharuay_db_user;
-- Index: idx_lotto_round_exemptions_round_id

-- DROP INDEX IF EXISTS public.idx_lotto_round_exemptions_round_id;

CREATE INDEX IF NOT EXISTS idx_lotto_round_exemptions_round_id
    ON public.lotto_round_exemptions USING btree
    (lotto_round_id ASC NULLS LAST)
    TABLESPACE pg_default;