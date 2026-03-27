--
-- PostgreSQL database dump
--

\restrict NNATRLQnYr2xYaarL89NqbZl2HuOaHnUKN74PmJWOqbUbOr7AMt8Pj6O57jA2NT

-- Dumped from database version 16.13 (Ubuntu 16.13-0ubuntu0.24.04.1)
-- Dumped by pg_dump version 16.13 (Ubuntu 16.13-0ubuntu0.24.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: log_job_status_change(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.log_job_status_change() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
        INSERT INTO job_status_history (job_card_id, status, changed_by_user_id)
        VALUES (NEW.id, NEW.status, NULL);
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.log_job_status_change()  OWNER TO jobcard_user;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column()  OWNER TO jobcard_user;

--
-- Name: validate_technician_role(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.validate_technician_role() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Check if the assigned user is actually a technician
  IF (SELECT role FROM users WHERE id = NEW.technician_id) != 'technician' THEN
    RAISE EXCEPTION 'Cannot assign job to non-technician user (user_id: %)', NEW.technician_id;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.validate_technician_role()  OWNER TO jobcard_user;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: customers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.customers (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(255) NOT NULL,
    email character varying(255),
    phone character varying(50) NOT NULL,
    address text,
    contact_person character varying(255),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.customers  OWNER TO jobcard_user;

--
-- Name: job_cards; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.job_cards (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    customer_id uuid NOT NULL,
    technician_id uuid NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    status character varying(50) DEFAULT 'pending'::character varying,
    priority character varying(50) DEFAULT 'medium'::character varying,
    scheduled_date date NOT NULL,
    estimated_duration integer,
    actual_start_time timestamp without time zone,
    actual_end_time timestamp without time zone,
    work_performed text,
    customer_signature text,
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    completed_at timestamp without time zone,
    payment_status character varying(20) DEFAULT 'unpaid'::character varying,
    payment_amount numeric(10,2),
    outstanding_balance numeric(10,2),
    payment_terms character varying(20),
    payment_due_date date,
    fully_paid_at timestamp without time zone,
    last_payment_id uuid,
    CONSTRAINT job_cards_priority_check CHECK (((priority)::text = ANY (ARRAY[('low'::character varying)::text, ('medium'::character varying)::text, ('high'::character varying)::text, ('urgent'::character varying)::text]))),
    CONSTRAINT job_cards_status_check CHECK (((status)::text = ANY (ARRAY[('pending'::character varying)::text, ('in_progress'::character varying)::text, ('completed'::character varying)::text])))
);


ALTER TABLE public.job_cards  OWNER TO jobcard_user;

--
-- Name: job_status_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.job_status_history (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    job_card_id uuid NOT NULL,
    status character varying(50) NOT NULL,
    changed_by_user_id uuid,
    changed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    notes text
);


ALTER TABLE public.job_status_history  OWNER TO jobcard_user;

--
-- Name: payment_links; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payment_links (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    job_card_id uuid NOT NULL,
    token character varying(64) NOT NULL,
    is_used boolean DEFAULT false,
    paystack_reference character varying(100),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.payment_links  OWNER TO jobcard_user;

--
-- Name: payments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payments (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    job_card_id uuid NOT NULL,
    phone_number character varying(20) NOT NULL,
    amount numeric(10,2) NOT NULL,
    amount_paid numeric(10,2),
    checkout_request_id character varying(255),
    mpesa_receipt_number character varying(50),
    account_reference character varying(100),
    payment_status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    result_code integer,
    result_description text,
    is_duplicate boolean DEFAULT false,
    requires_review boolean DEFAULT false,
    payment_initiated timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    payment_completed timestamp without time zone,
    transaction_date timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.payments  OWNER TO jobcard_user;

--
-- Name: user_activity_log; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_activity_log (
    id integer NOT NULL,
    user_id integer,
    action character varying(100) NOT NULL,
    details jsonb,
    performed_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.user_activity_log  OWNER TO jobcard_user;

--
-- Name: user_activity_log_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_activity_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_activity_log_id_seq  OWNER TO jobcard_user;

--
-- Name: user_activity_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_activity_log_id_seq OWNED BY public.user_activity_log.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    password character varying(255) NOT NULL,
    role character varying(50) NOT NULL,
    phone character varying(50),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp without time zone,
    CONSTRAINT users_role_check CHECK (((role)::text = ANY (ARRAY[('supervisor'::character varying)::text, ('technician'::character varying)::text])))
);


ALTER TABLE public.users  OWNER TO jobcard_user;

--
-- Name: user_activity_log id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_activity_log ALTER COLUMN id SET DEFAULT nextval('public.user_activity_log_id_seq'::regclass);


--
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (id);


--
-- Name: job_cards job_cards_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.job_cards
    ADD CONSTRAINT job_cards_pkey PRIMARY KEY (id);


--
-- Name: job_status_history job_status_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.job_status_history
    ADD CONSTRAINT job_status_history_pkey PRIMARY KEY (id);


--
-- Name: payment_links payment_links_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_links
    ADD CONSTRAINT payment_links_pkey PRIMARY KEY (id);


--
-- Name: payment_links payment_links_token_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_links
    ADD CONSTRAINT payment_links_token_key UNIQUE (token);


--
-- Name: payments payments_checkout_request_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_checkout_request_id_key UNIQUE (checkout_request_id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: payment_links unique_job_card_id; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_links
    ADD CONSTRAINT unique_job_card_id UNIQUE (job_card_id);


--
-- Name: user_activity_log user_activity_log_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_activity_log
    ADD CONSTRAINT user_activity_log_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_customers_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_customers_name ON public.customers USING btree (name);


--
-- Name: idx_customers_phone; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_customers_phone ON public.customers USING btree (phone);


--
-- Name: idx_job_cards_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_job_cards_created_at ON public.job_cards USING btree (created_at);


--
-- Name: idx_job_cards_customer; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_job_cards_customer ON public.job_cards USING btree (customer_id);


--
-- Name: idx_job_cards_scheduled_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_job_cards_scheduled_date ON public.job_cards USING btree (scheduled_date);


--
-- Name: idx_job_cards_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_job_cards_status ON public.job_cards USING btree (status);


--
-- Name: idx_job_cards_technician; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_job_cards_technician ON public.job_cards USING btree (technician_id);


--
-- Name: idx_job_payment_due; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_job_payment_due ON public.job_cards USING btree (payment_status, payment_due_date);


--
-- Name: idx_job_payment_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_job_payment_status ON public.job_cards USING btree (payment_status);


--
-- Name: idx_job_status_history_changed_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_job_status_history_changed_at ON public.job_status_history USING btree (changed_at);


--
-- Name: idx_job_status_history_job_card; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_job_status_history_job_card ON public.job_status_history USING btree (job_card_id);


--
-- Name: idx_payment_links_job_card_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payment_links_job_card_id ON public.payment_links USING btree (job_card_id);


--
-- Name: idx_payment_links_token; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payment_links_token ON public.payment_links USING btree (token);


--
-- Name: idx_payments_job_card; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payments_job_card ON public.payments USING btree (job_card_id);


--
-- Name: idx_payments_receipt; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payments_receipt ON public.payments USING btree (mpesa_receipt_number);


--
-- Name: idx_payments_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payments_status ON public.payments USING btree (payment_status);


--
-- Name: idx_payments_status_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payments_status_created ON public.payments USING btree (payment_status, created_at);


--
-- Name: idx_users_deleted_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_deleted_at ON public.users USING btree (deleted_at);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: idx_users_role; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_role ON public.users USING btree (role);


--
-- Name: job_cards log_status_change; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER log_status_change AFTER INSERT OR UPDATE ON public.job_cards FOR EACH ROW EXECUTE FUNCTION public.log_job_status_change();


--
-- Name: customers update_customers_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: job_cards update_job_cards_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_job_cards_updated_at BEFORE UPDATE ON public.job_cards FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: payments update_payments_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: users update_users_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: job_cards job_cards_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.job_cards
    ADD CONSTRAINT job_cards_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE RESTRICT;


--
-- Name: job_cards job_cards_last_payment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.job_cards
    ADD CONSTRAINT job_cards_last_payment_id_fkey FOREIGN KEY (last_payment_id) REFERENCES public.payments(id);


--
-- Name: job_cards job_cards_technician_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.job_cards
    ADD CONSTRAINT job_cards_technician_id_fkey FOREIGN KEY (technician_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: job_status_history job_status_history_changed_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.job_status_history
    ADD CONSTRAINT job_status_history_changed_by_user_id_fkey FOREIGN KEY (changed_by_user_id) REFERENCES public.users(id);


--
-- Name: job_status_history job_status_history_job_card_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.job_status_history
    ADD CONSTRAINT job_status_history_job_card_id_fkey FOREIGN KEY (job_card_id) REFERENCES public.job_cards(id) ON DELETE CASCADE;


--
-- Name: payment_links payment_links_job_card_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_links
    ADD CONSTRAINT payment_links_job_card_id_fkey FOREIGN KEY (job_card_id) REFERENCES public.job_cards(id) ON DELETE CASCADE;


--
-- Name: payments payments_job_card_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_job_card_id_fkey FOREIGN KEY (job_card_id) REFERENCES public.job_cards(id) ON DELETE RESTRICT;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT ALL ON SCHEMA public TO jobcard_user;


--
-- Name: TABLE customers; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.customers TO jobcard_user;


--
-- Name: TABLE job_cards; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.job_cards TO jobcard_user;


--
-- Name: TABLE job_status_history; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.job_status_history TO jobcard_user;


--
-- Name: TABLE payment_links; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.payment_links TO jobcard_user;


--
-- Name: TABLE payments; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.payments TO jobcard_user;


--
-- Name: TABLE user_activity_log; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.user_activity_log TO jobcard_user;


--
-- Name: SEQUENCE user_activity_log_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.user_activity_log_id_seq TO jobcard_user;


--
-- Name: TABLE users; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.users TO jobcard_user;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE jobcard_user IN SCHEMA public GRANT ALL ON SEQUENCES TO jobcard_user;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE jobcard_user IN SCHEMA public GRANT ALL ON TABLES TO jobcard_user;


--
-- PostgreSQL database dump complete
--

\unrestrict NNATRLQnYr2xYaarL89NqbZl2HuOaHnUKN74PmJWOqbUbOr7AMt8Pj6O57jA2NT

