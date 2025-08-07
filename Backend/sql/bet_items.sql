-- Table: public.bet_items

-- DROP TABLE IF EXISTS public.bet_items;

CREATE TABLE IF NOT EXISTS public.bet_items
(
    id integer NOT NULL DEFAULT nextval('bet_items_id_seq'::regclass),
    bill_entry_id integer NOT NULL,
    bet_number character varying(10) COLLATE pg_catalog."default" NOT NULL,
    status character varying(50) COLLATE pg_catalog."default",
    price numeric(10,2) NOT NULL DEFAULT 0,
    bet_style character varying(10) COLLATE pg_catalog."default" NOT NULL DEFAULT 'บน'::character varying,
    rate numeric(10,2) NOT NULL DEFAULT 0,
    payout_amount numeric(12,2) NOT NULL DEFAULT 0,
    baht_per numeric(10,2),
    CONSTRAINT bet_items_pkey PRIMARY KEY (id),
    CONSTRAINT bet_items_bill_entry_id_fkey FOREIGN KEY (bill_entry_id)
        REFERENCES public.bill_entries (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.bet_items
    OWNER to postgres;
-- Index: idx_bet_items_bill_entry_id

-- DROP INDEX IF EXISTS public.idx_bet_items_bill_entry_id;

CREATE INDEX IF NOT EXISTS idx_bet_items_bill_entry_id
    ON public.bet_items USING btree
    (bill_entry_id ASC NULLS LAST)
    TABLESPACE pg_default;