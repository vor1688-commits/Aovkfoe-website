-- Table: public.lotto_round_range_limits

-- DROP TABLE IF EXISTS public.lotto_round_range_limits;

CREATE TABLE IF NOT EXISTS public.lotto_round_range_limits
(
    id integer NOT NULL DEFAULT nextval('lotto_round_range_limits_id_seq'::regclass),
    lotto_round_id integer NOT NULL,
    range_start character varying(10) COLLATE pg_catalog."default" NOT NULL,
    range_end character varying(10) COLLATE pg_catalog."default" NOT NULL,
    max_amount numeric(12,2) NOT NULL,
    CONSTRAINT lotto_round_range_limits_pkey PRIMARY KEY (id),
    CONSTRAINT lotto_round_range_limits_lotto_round_id_fkey FOREIGN KEY (lotto_round_id)
        REFERENCES public.lotto_rounds (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.lotto_round_range_limits
    OWNER to maharuay_db_user;
-- Index: idx_lotto_round_range_limits_round_id

-- DROP INDEX IF EXISTS public.idx_lotto_round_range_limits_round_id;

CREATE INDEX IF NOT EXISTS idx_lotto_round_range_limits_round_id
    ON public.lotto_round_range_limits USING btree
    (lotto_round_id ASC NULLS LAST)
    TABLESPACE pg_default;



ALTER TABLE public.lotto_round_range_limits
ADD COLUMN number_limit_types VARCHAR(20) NOT NULL DEFAULT 'ทั้งหมด';