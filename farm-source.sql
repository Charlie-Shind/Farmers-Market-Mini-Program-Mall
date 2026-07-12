--
-- PostgreSQL database dump
--

\restrict XSi67ZP1bJ80pBKOV9pOHOKOSSzprSuEPRXEUAeLHzDEBeHTxGO2onGU2lSyaKU

-- Dumped from database version 18.0
-- Dumped by pg_dump version 18.0

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: farm
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO farm;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: farm
--

COMMENT ON SCHEMA public IS '';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: farm
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO farm;

--
-- Name: account_serial; Type: TABLE; Schema: public; Owner: farm
--

CREATE TABLE public.account_serial (
    id bigint NOT NULL,
    scope character varying(16) NOT NULL,
    date_key character varying(8) NOT NULL,
    last_value integer DEFAULT 0 NOT NULL,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL
);


ALTER TABLE public.account_serial OWNER TO farm;

--
-- Name: account_serial_id_seq; Type: SEQUENCE; Schema: public; Owner: farm
--

CREATE SEQUENCE public.account_serial_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.account_serial_id_seq OWNER TO farm;

--
-- Name: account_serial_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: farm
--

ALTER SEQUENCE public.account_serial_id_seq OWNED BY public.account_serial.id;


--
-- Name: activity; Type: TABLE; Schema: public; Owner: farm
--

CREATE TABLE public.activity (
    id bigint NOT NULL,
    activity_name character varying(128) NOT NULL,
    activity_type character varying(32) NOT NULL,
    status character varying(32) DEFAULT 'DRAFT'::character varying NOT NULL,
    start_at timestamp(6) without time zone,
    end_at timestamp(6) without time zone,
    product_count integer DEFAULT 0 NOT NULL,
    rule_json jsonb,
    products_json jsonb,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL,
    deleted_at timestamp(6) without time zone,
    merchant_id bigint,
    remark character varying(255)
);


ALTER TABLE public.activity OWNER TO farm;

--
-- Name: activity_draft; Type: TABLE; Schema: public; Owner: farm
--

CREATE TABLE public.activity_draft (
    id bigint NOT NULL,
    merchant_id bigint NOT NULL,
    draft_no character varying(64) NOT NULL,
    title character varying(128),
    activity_type character varying(32),
    payload_json jsonb NOT NULL,
    updated_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.activity_draft OWNER TO farm;

--
-- Name: activity_draft_id_seq; Type: SEQUENCE; Schema: public; Owner: farm
--

CREATE SEQUENCE public.activity_draft_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.activity_draft_id_seq OWNER TO farm;

--
-- Name: activity_draft_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: farm
--

ALTER SEQUENCE public.activity_draft_id_seq OWNED BY public.activity_draft.id;


--
-- Name: activity_id_seq; Type: SEQUENCE; Schema: public; Owner: farm
--

CREATE SEQUENCE public.activity_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.activity_id_seq OWNER TO farm;

--
-- Name: activity_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: farm
--

ALTER SEQUENCE public.activity_id_seq OWNED BY public.activity.id;


--
-- Name: activity_product; Type: TABLE; Schema: public; Owner: farm
--

CREATE TABLE public.activity_product (
    id bigint NOT NULL,
    activity_id bigint NOT NULL,
    product_id bigint NOT NULL,
    sku_id bigint,
    activity_price numeric(18,2),
    activity_stock integer,
    limit_per_user integer,
    sort_order integer DEFAULT 0 NOT NULL,
    status character varying(32) DEFAULT 'ENABLED'::character varying NOT NULL,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.activity_product OWNER TO farm;

--
-- Name: activity_product_id_seq; Type: SEQUENCE; Schema: public; Owner: farm
--

CREATE SEQUENCE public.activity_product_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.activity_product_id_seq OWNER TO farm;

--
-- Name: activity_product_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: farm
--

ALTER SEQUENCE public.activity_product_id_seq OWNED BY public.activity_product.id;


--
-- Name: admin_operation_log; Type: TABLE; Schema: public; Owner: farm
--

CREATE TABLE public.admin_operation_log (
    id bigint NOT NULL,
    admin_user_id bigint,
    action character varying(64) NOT NULL,
    target_type character varying(64),
    target_id bigint,
    content jsonb,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.admin_operation_log OWNER TO farm;

--
-- Name: admin_operation_log_id_seq; Type: SEQUENCE; Schema: public; Owner: farm
--

CREATE SEQUENCE public.admin_operation_log_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.admin_operation_log_id_seq OWNER TO farm;

--
-- Name: admin_operation_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: farm
--

ALTER SEQUENCE public.admin_operation_log_id_seq OWNED BY public.admin_operation_log.id;


--
-- Name: admin_role; Type: TABLE; Schema: public; Owner: farm
--

CREATE TABLE public.admin_role (
    id bigint NOT NULL,
    code character varying(32) NOT NULL,
    name character varying(64) NOT NULL,
    status smallint DEFAULT 1 NOT NULL,
    permission_json jsonb,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL
);


ALTER TABLE public.admin_role OWNER TO farm;

--
-- Name: admin_role_id_seq; Type: SEQUENCE; Schema: public; Owner: farm
--

CREATE SEQUENCE public.admin_role_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.admin_role_id_seq OWNER TO farm;

--
-- Name: admin_role_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: farm
--

ALTER SEQUENCE public.admin_role_id_seq OWNED BY public.admin_role.id;


--
-- Name: admin_user; Type: TABLE; Schema: public; Owner: farm
--

CREATE TABLE public.admin_user (
    id bigint NOT NULL,
    username character varying(64) NOT NULL,
    account_no character varying(32),
    password_hash character varying(255) NOT NULL,
    nickname character varying(64) NOT NULL,
    mobile character varying(20),
    status smallint DEFAULT 1 NOT NULL,
    last_login_at timestamp(6) without time zone,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL,
    deleted_at timestamp(6) without time zone
);


ALTER TABLE public.admin_user OWNER TO farm;

--
-- Name: admin_user_id_seq; Type: SEQUENCE; Schema: public; Owner: farm
--

CREATE SEQUENCE public.admin_user_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.admin_user_id_seq OWNER TO farm;

--
-- Name: admin_user_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: farm
--

ALTER SEQUENCE public.admin_user_id_seq OWNED BY public.admin_user.id;


--
-- Name: admin_user_role; Type: TABLE; Schema: public; Owner: farm
--

CREATE TABLE public.admin_user_role (
    id bigint NOT NULL,
    admin_user_id bigint NOT NULL,
    admin_role_id bigint NOT NULL,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.admin_user_role OWNER TO farm;

--
-- Name: admin_user_role_id_seq; Type: SEQUENCE; Schema: public; Owner: farm
--

CREATE SEQUENCE public.admin_user_role_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.admin_user_role_id_seq OWNER TO farm;

--
-- Name: admin_user_role_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: farm
--

ALTER SEQUENCE public.admin_user_role_id_seq OWNED BY public.admin_user_role.id;


--
-- Name: banner; Type: TABLE; Schema: public; Owner: farm
--

CREATE TABLE public.banner (
    id bigint NOT NULL,
    title character varying(128) NOT NULL,
    image_url character varying(255) NOT NULL,
    link_type character varying(32) NOT NULL,
    link_id bigint,
    start_at timestamp(6) without time zone,
    end_at timestamp(6) without time zone,
    sort_order integer DEFAULT 0 NOT NULL,
    status character varying(32) DEFAULT 'ENABLED'::character varying NOT NULL,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL,
    deleted_at timestamp(6) without time zone
);


ALTER TABLE public.banner OWNER TO farm;

--
-- Name: banner_id_seq; Type: SEQUENCE; Schema: public; Owner: farm
--

CREATE SEQUENCE public.banner_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.banner_id_seq OWNER TO farm;

--
-- Name: banner_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: farm
--

ALTER SEQUENCE public.banner_id_seq OWNED BY public.banner.id;


--
-- Name: cart; Type: TABLE; Schema: public; Owner: farm
--

CREATE TABLE public.cart (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    merchant_id bigint NOT NULL,
    product_id bigint NOT NULL,
    sku_id bigint NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    checked boolean DEFAULT true NOT NULL,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL
);


ALTER TABLE public.cart OWNER TO farm;

--
-- Name: cart_id_seq; Type: SEQUENCE; Schema: public; Owner: farm
--

CREATE SEQUENCE public.cart_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.cart_id_seq OWNER TO farm;

--
-- Name: cart_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: farm
--

ALTER SEQUENCE public.cart_id_seq OWNED BY public.cart.id;


--
-- Name: category; Type: TABLE; Schema: public; Owner: farm
--

CREATE TABLE public.category (
    id bigint NOT NULL,
    parent_id bigint,
    name character varying(64) NOT NULL,
    icon_url character varying(255),
    sort_order integer DEFAULT 0 NOT NULL,
    status smallint DEFAULT 1 NOT NULL,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL,
    deleted_at timestamp(6) without time zone
);


ALTER TABLE public.category OWNER TO farm;

--
-- Name: category_id_seq; Type: SEQUENCE; Schema: public; Owner: farm
--

CREATE SEQUENCE public.category_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.category_id_seq OWNER TO farm;

--
-- Name: category_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: farm
--

ALTER SEQUENCE public.category_id_seq OWNED BY public.category.id;


--
-- Name: chat_conversation; Type: TABLE; Schema: public; Owner: farm
--

CREATE TABLE public.chat_conversation (
    id bigint NOT NULL,
    conversation_key character varying(160) NOT NULL,
    buyer_id bigint NOT NULL,
    merchant_id bigint NOT NULL,
    product_id bigint,
    order_no character varying(64),
    title character varying(128),
    scene_type character varying(32) DEFAULT 'GENERAL'::character varying NOT NULL,
    scene_label character varying(128) DEFAULT ''::character varying NOT NULL,
    scene_source character varying(255) DEFAULT ''::character varying NOT NULL,
    last_message_id bigint,
    last_message_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    status character varying(16) DEFAULT 'ACTIVE'::character varying NOT NULL,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL,
    deleted_at timestamp(6) without time zone
);


ALTER TABLE public.chat_conversation OWNER TO farm;

--
-- Name: chat_conversation_id_seq; Type: SEQUENCE; Schema: public; Owner: farm
--

CREATE SEQUENCE public.chat_conversation_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.chat_conversation_id_seq OWNER TO farm;

--
-- Name: chat_conversation_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: farm
--

ALTER SEQUENCE public.chat_conversation_id_seq OWNED BY public.chat_conversation.id;


--
-- Name: chat_message; Type: TABLE; Schema: public; Owner: farm
--

CREATE TABLE public.chat_message (
    id bigint NOT NULL,
    conversation_id bigint NOT NULL,
    sender_id bigint NOT NULL,
    receiver_id bigint NOT NULL,
    sender_role character varying(16) NOT NULL,
    content_type character varying(16) DEFAULT 'TEXT'::character varying NOT NULL,
    content text NOT NULL,
    attachments jsonb,
    read_at timestamp(6) without time zone,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL,
    deleted_at timestamp(6) without time zone
);


ALTER TABLE public.chat_message OWNER TO farm;

--
-- Name: chat_message_id_seq; Type: SEQUENCE; Schema: public; Owner: farm
--

CREATE SEQUENCE public.chat_message_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.chat_message_id_seq OWNER TO farm;

--
-- Name: chat_message_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: farm
--

ALTER SEQUENCE public.chat_message_id_seq OWNED BY public.chat_message.id;


--
-- Name: community_leader; Type: TABLE; Schema: public; Owner: farm
--

CREATE TABLE public.community_leader (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    application_no character varying(64) NOT NULL,
    real_name character varying(64) NOT NULL,
    mobile character varying(32) NOT NULL,
    id_card_no character varying(32),
    id_card_front_url character varying(512),
    id_card_back_url character varying(512),
    business_cert_url character varying(512),
    status character varying(32) DEFAULT 'PENDING_AUDIT'::character varying NOT NULL,
    reject_reason character varying(255),
    commission_rate numeric(8,4),
    audited_by bigint,
    audited_at timestamp(6) without time zone,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL,
    deleted_at timestamp(6) without time zone
);


ALTER TABLE public.community_leader OWNER TO farm;

--
-- Name: community_leader_id_seq; Type: SEQUENCE; Schema: public; Owner: farm
--

CREATE SEQUENCE public.community_leader_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.community_leader_id_seq OWNER TO farm;

--
-- Name: community_leader_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: farm
--

ALTER SEQUENCE public.community_leader_id_seq OWNED BY public.community_leader.id;


--
-- Name: coupon; Type: TABLE; Schema: public; Owner: farm
--

CREATE TABLE public.coupon (
    id bigint NOT NULL,
    name character varying(128) NOT NULL,
    type character varying(32) NOT NULL,
    threshold_amount numeric(18,2) NOT NULL,
    discount_amount numeric(18,2) NOT NULL,
    stock integer DEFAULT 0 NOT NULL,
    issued_stock integer DEFAULT 0 NOT NULL,
    valid_start_at timestamp(6) without time zone,
    valid_end_at timestamp(6) without time zone,
    scope character varying(32) DEFAULT 'ALL'::character varying NOT NULL,
    per_user_limit integer DEFAULT 1 NOT NULL,
    rule_json jsonb,
    status character varying(32) DEFAULT 'ENABLED'::character varying NOT NULL,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL,
    deleted_at timestamp(6) without time zone
);


ALTER TABLE public.coupon OWNER TO farm;

--
-- Name: coupon_id_seq; Type: SEQUENCE; Schema: public; Owner: farm
--

CREATE SEQUENCE public.coupon_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.coupon_id_seq OWNER TO farm;

--
-- Name: coupon_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: farm
--

ALTER SEQUENCE public.coupon_id_seq OWNED BY public.coupon.id;


--
-- Name: delivery_record; Type: TABLE; Schema: public; Owner: farm
--

CREATE TABLE public.delivery_record (
    id bigint NOT NULL,
    order_id bigint NOT NULL,
    merchant_id bigint NOT NULL,
    logistics_company character varying(64),
    tracking_no character varying(64),
    delivery_status smallint DEFAULT 1 NOT NULL,
    shipped_at timestamp(6) without time zone,
    delivered_at timestamp(6) without time zone,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL
);


ALTER TABLE public.delivery_record OWNER TO farm;

--
-- Name: delivery_record_id_seq; Type: SEQUENCE; Schema: public; Owner: farm
--

CREATE SEQUENCE public.delivery_record_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.delivery_record_id_seq OWNER TO farm;

--
-- Name: delivery_record_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: farm
--

ALTER SEQUENCE public.delivery_record_id_seq OWNED BY public.delivery_record.id;


--
-- Name: favorite; Type: TABLE; Schema: public; Owner: farm
--

CREATE TABLE public.favorite (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    product_id bigint NOT NULL,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.favorite OWNER TO farm;

--
-- Name: favorite_id_seq; Type: SEQUENCE; Schema: public; Owner: farm
--

CREATE SEQUENCE public.favorite_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.favorite_id_seq OWNER TO farm;

--
-- Name: favorite_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: farm
--

ALTER SEQUENCE public.favorite_id_seq OWNED BY public.favorite.id;


--
-- Name: feedback; Type: TABLE; Schema: public; Owner: farm
--

CREATE TABLE public.feedback (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    type character varying(32) NOT NULL,
    content text NOT NULL,
    images jsonb,
    status character varying(32) DEFAULT 'PENDING'::character varying NOT NULL,
    reply text,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.feedback OWNER TO farm;

--
-- Name: feedback_id_seq; Type: SEQUENCE; Schema: public; Owner: farm
--

CREATE SEQUENCE public.feedback_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.feedback_id_seq OWNER TO farm;

--
-- Name: feedback_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: farm
--

ALTER SEQUENCE public.feedback_id_seq OWNED BY public.feedback.id;


--
-- Name: flash_sale_claim; Type: TABLE; Schema: public; Owner: farm
--

CREATE TABLE public.flash_sale_claim (
    id bigint NOT NULL,
    item_id bigint NOT NULL,
    user_id bigint NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    order_no character varying(64),
    status character varying(16) DEFAULT 'RESERVED'::character varying NOT NULL,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL
);


ALTER TABLE public.flash_sale_claim OWNER TO farm;

--
-- Name: flash_sale_claim_id_seq; Type: SEQUENCE; Schema: public; Owner: farm
--

CREATE SEQUENCE public.flash_sale_claim_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.flash_sale_claim_id_seq OWNER TO farm;

--
-- Name: flash_sale_claim_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: farm
--

ALTER SEQUENCE public.flash_sale_claim_id_seq OWNED BY public.flash_sale_claim.id;


--
-- Name: flash_sale_item; Type: TABLE; Schema: public; Owner: farm
--

CREATE TABLE public.flash_sale_item (
    id bigint NOT NULL,
    window_id bigint NOT NULL,
    product_id bigint NOT NULL,
    sku_id bigint NOT NULL,
    flash_price numeric(18,2) NOT NULL,
    origin_price numeric(18,2) NOT NULL,
    total_stock integer NOT NULL,
    stock_left integer NOT NULL,
    per_user_limit integer DEFAULT 2 NOT NULL,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL
);


ALTER TABLE public.flash_sale_item OWNER TO farm;

--
-- Name: flash_sale_item_id_seq; Type: SEQUENCE; Schema: public; Owner: farm
--

CREATE SEQUENCE public.flash_sale_item_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.flash_sale_item_id_seq OWNER TO farm;

--
-- Name: flash_sale_item_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: farm
--

ALTER SEQUENCE public.flash_sale_item_id_seq OWNED BY public.flash_sale_item.id;


--
-- Name: flash_sale_window; Type: TABLE; Schema: public; Owner: farm
--

CREATE TABLE public.flash_sale_window (
    id bigint NOT NULL,
    label character varying(64) NOT NULL,
    start_at timestamp(6) without time zone NOT NULL,
    end_at timestamp(6) without time zone NOT NULL,
    status character varying(16) DEFAULT 'UPCOMING'::character varying NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL
);


ALTER TABLE public.flash_sale_window OWNER TO farm;

--
-- Name: flash_sale_window_id_seq; Type: SEQUENCE; Schema: public; Owner: farm
--

CREATE SEQUENCE public.flash_sale_window_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.flash_sale_window_id_seq OWNER TO farm;

--
-- Name: flash_sale_window_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: farm
--

ALTER SEQUENCE public.flash_sale_window_id_seq OWNED BY public.flash_sale_window.id;


--
-- Name: group_buy; Type: TABLE; Schema: public; Owner: farm
--

CREATE TABLE public.group_buy (
    id bigint NOT NULL,
    group_no character varying(64) NOT NULL,
    invite_code character varying(10),
    product_id bigint NOT NULL,
    sku_id bigint NOT NULL,
    initiator_id bigint NOT NULL,
    group_price numeric(18,2) NOT NULL,
    origin_price numeric(18,2) NOT NULL,
    needed integer NOT NULL,
    status character varying(16) DEFAULT 'OPEN'::character varying NOT NULL,
    expire_at timestamp(6) without time zone NOT NULL,
    completed_at timestamp(6) without time zone,
    rough_area character varying(64),
    latitude numeric(10,6),
    longitude numeric(10,6),
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL
);


ALTER TABLE public.group_buy OWNER TO farm;

--
-- Name: group_buy_id_seq; Type: SEQUENCE; Schema: public; Owner: farm
--

CREATE SEQUENCE public.group_buy_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.group_buy_id_seq OWNER TO farm;

--
-- Name: group_buy_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: farm
--

ALTER SEQUENCE public.group_buy_id_seq OWNED BY public.group_buy.id;


--
-- Name: group_buy_member; Type: TABLE; Schema: public; Owner: farm
--

CREATE TABLE public.group_buy_member (
    id bigint NOT NULL,
    group_id bigint NOT NULL,
    user_id bigint NOT NULL,
    is_initiator boolean DEFAULT false NOT NULL,
    order_no character varying(64),
    joined_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.group_buy_member OWNER TO farm;

--
-- Name: group_buy_member_id_seq; Type: SEQUENCE; Schema: public; Owner: farm
--

CREATE SEQUENCE public.group_buy_member_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.group_buy_member_id_seq OWNER TO farm;

--
-- Name: group_buy_member_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: farm
--

ALTER SEQUENCE public.group_buy_member_id_seq OWNED BY public.group_buy_member.id;


--
-- Name: leader_application; Type: TABLE; Schema: public; Owner: farm
--

CREATE TABLE public.leader_application (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    application_no character varying(64) NOT NULL,
    status character varying(32) DEFAULT 'PENDING_AUDIT'::character varying NOT NULL,
    input_json jsonb,
    remark character varying(255),
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.leader_application OWNER TO farm;

--
-- Name: leader_application_id_seq; Type: SEQUENCE; Schema: public; Owner: farm
--

CREATE SEQUENCE public.leader_application_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.leader_application_id_seq OWNER TO farm;

--
-- Name: leader_application_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: farm
--

ALTER SEQUENCE public.leader_application_id_seq OWNED BY public.leader_application.id;


--
-- Name: leader_commission; Type: TABLE; Schema: public; Owner: farm
--

CREATE TABLE public.leader_commission (
    id bigint NOT NULL,
    order_no character varying(64) NOT NULL,
    commission_amount numeric(18,2) NOT NULL,
    status character varying(32) DEFAULT 'PENDING_SETTLEMENT'::character varying NOT NULL,
    remark character varying(255),
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL,
    leader_id bigint,
    order_id bigint,
    order_amount numeric(18,2) DEFAULT 0 NOT NULL,
    commission_rate numeric(8,4) DEFAULT 0 NOT NULL,
    settled_at timestamp(6) without time zone,
    user_id bigint NOT NULL,
    bound_leader_id bigint,
    deleted_at timestamp(6) without time zone
);


ALTER TABLE public.leader_commission OWNER TO farm;

--
-- Name: leader_commission_id_seq; Type: SEQUENCE; Schema: public; Owner: farm
--

CREATE SEQUENCE public.leader_commission_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.leader_commission_id_seq OWNER TO farm;

--
-- Name: leader_commission_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: farm
--

ALTER SEQUENCE public.leader_commission_id_seq OWNED BY public.leader_commission.id;


--
-- Name: logistics_rule; Type: TABLE; Schema: public; Owner: farm
--

CREATE TABLE public.logistics_rule (
    id bigint NOT NULL,
    name character varying(128) NOT NULL,
    province character varying(64) NOT NULL,
    threshold_amount numeric(18,2) NOT NULL,
    freight_amount numeric(18,2) NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL
);


ALTER TABLE public.logistics_rule OWNER TO farm;

--
-- Name: logistics_rule_id_seq; Type: SEQUENCE; Schema: public; Owner: farm
--

CREATE SEQUENCE public.logistics_rule_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.logistics_rule_id_seq OWNER TO farm;

--
-- Name: logistics_rule_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: farm
--

ALTER SEQUENCE public.logistics_rule_id_seq OWNED BY public.logistics_rule.id;


--
-- Name: merchant; Type: TABLE; Schema: public; Owner: farm
--

CREATE TABLE public.merchant (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    store_name character varying(128) NOT NULL,
    store_logo character varying(255),
    contact_name character varying(64) NOT NULL,
    contact_mobile character varying(20) NOT NULL,
    status smallint DEFAULT 2 NOT NULL,
    commission_rate numeric(10,4),
    settled_at timestamp(6) without time zone,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL,
    deleted_at timestamp(6) without time zone
);


ALTER TABLE public.merchant OWNER TO farm;

--
-- Name: merchant_delivery_setting; Type: TABLE; Schema: public; Owner: farm
--

CREATE TABLE public.merchant_delivery_setting (
    id bigint NOT NULL,
    merchant_id bigint NOT NULL,
    sender_name character varying(64),
    sender_mobile character varying(20),
    sender_address character varying(255),
    default_company character varying(64),
    cold_chain_enabled boolean DEFAULT false NOT NULL,
    restricted_regions jsonb,
    updated_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.merchant_delivery_setting OWNER TO farm;

--
-- Name: merchant_delivery_setting_id_seq; Type: SEQUENCE; Schema: public; Owner: farm
--

CREATE SEQUENCE public.merchant_delivery_setting_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.merchant_delivery_setting_id_seq OWNER TO farm;

--
-- Name: merchant_delivery_setting_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: farm
--

ALTER SEQUENCE public.merchant_delivery_setting_id_seq OWNED BY public.merchant_delivery_setting.id;


--
-- Name: merchant_id_seq; Type: SEQUENCE; Schema: public; Owner: farm
--

CREATE SEQUENCE public.merchant_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.merchant_id_seq OWNER TO farm;

--
-- Name: merchant_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: farm
--

ALTER SEQUENCE public.merchant_id_seq OWNED BY public.merchant.id;


--
-- Name: merchant_product_draft; Type: TABLE; Schema: public; Owner: farm
--

CREATE TABLE public.merchant_product_draft (
    id bigint NOT NULL,
    merchant_id bigint NOT NULL,
    draft_no character varying(32) NOT NULL,
    title character varying(128) NOT NULL,
    cover_url character varying(255),
    payload jsonb NOT NULL,
    deleted_at timestamp(6) without time zone,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL
);


ALTER TABLE public.merchant_product_draft OWNER TO farm;

--
-- Name: merchant_product_draft_id_seq; Type: SEQUENCE; Schema: public; Owner: farm
--

CREATE SEQUENCE public.merchant_product_draft_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.merchant_product_draft_id_seq OWNER TO farm;

--
-- Name: merchant_product_draft_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: farm
--

ALTER SEQUENCE public.merchant_product_draft_id_seq OWNED BY public.merchant_product_draft.id;


--
-- Name: merchant_qualification; Type: TABLE; Schema: public; Owner: farm
--

CREATE TABLE public.merchant_qualification (
    id bigint NOT NULL,
    merchant_id bigint NOT NULL,
    qualification_type character varying(64) NOT NULL,
    file_name character varying(255) NOT NULL,
    file_url character varying(255) NOT NULL,
    status smallint DEFAULT 2 NOT NULL,
    audit_remark character varying(255),
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL
);


ALTER TABLE public.merchant_qualification OWNER TO farm;

--
-- Name: merchant_qualification_id_seq; Type: SEQUENCE; Schema: public; Owner: farm
--

CREATE SEQUENCE public.merchant_qualification_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.merchant_qualification_id_seq OWNER TO farm;

--
-- Name: merchant_qualification_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: farm
--

ALTER SEQUENCE public.merchant_qualification_id_seq OWNED BY public.merchant_qualification.id;


--
-- Name: merchant_wallet; Type: TABLE; Schema: public; Owner: farm
--

CREATE TABLE public.merchant_wallet (
    id bigint NOT NULL,
    merchant_id bigint NOT NULL,
    available_balance numeric(18,2) DEFAULT 0 NOT NULL,
    frozen_balance numeric(18,2) DEFAULT 0 NOT NULL,
    total_income numeric(18,2) DEFAULT 0 NOT NULL,
    total_withdrawn numeric(18,2) DEFAULT 0 NOT NULL,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL
);


ALTER TABLE public.merchant_wallet OWNER TO farm;

--
-- Name: merchant_wallet_id_seq; Type: SEQUENCE; Schema: public; Owner: farm
--

CREATE SEQUENCE public.merchant_wallet_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.merchant_wallet_id_seq OWNER TO farm;

--
-- Name: merchant_wallet_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: farm
--

ALTER SEQUENCE public.merchant_wallet_id_seq OWNED BY public.merchant_wallet.id;


--
-- Name: order_item; Type: TABLE; Schema: public; Owner: farm
--

CREATE TABLE public.order_item (
    id bigint NOT NULL,
    order_id bigint NOT NULL,
    product_id bigint NOT NULL,
    sku_id bigint NOT NULL,
    product_title character varying(128) NOT NULL,
    sku_name character varying(128) NOT NULL,
    product_image character varying(255),
    unit_price numeric(18,2) NOT NULL,
    quantity integer NOT NULL,
    line_amount numeric(18,2) NOT NULL,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.order_item OWNER TO farm;

--
-- Name: order_item_id_seq; Type: SEQUENCE; Schema: public; Owner: farm
--

CREATE SEQUENCE public.order_item_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.order_item_id_seq OWNER TO farm;

--
-- Name: order_item_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: farm
--

ALTER SEQUENCE public.order_item_id_seq OWNED BY public.order_item.id;


--
-- Name: orders; Type: TABLE; Schema: public; Owner: farm
--

CREATE TABLE public.orders (
    id bigint NOT NULL,
    order_no character varying(64) NOT NULL,
    parent_order_no character varying(64),
    is_parent boolean DEFAULT false NOT NULL,
    user_id bigint NOT NULL,
    merchant_id bigint NOT NULL,
    group_buy_id bigint,
    address_snapshot jsonb NOT NULL,
    goods_amount numeric(18,2) NOT NULL,
    freight_amount numeric(18,2) DEFAULT 0 NOT NULL,
    discount_amount numeric(18,2) DEFAULT 0 NOT NULL,
    pay_amount numeric(18,2) NOT NULL,
    order_status smallint DEFAULT 1 NOT NULL,
    pay_status smallint DEFAULT 1 NOT NULL,
    delivery_status smallint DEFAULT 1 NOT NULL,
    refund_status smallint DEFAULT 0 NOT NULL,
    expire_at timestamp(6) without time zone,
    paid_at timestamp(6) without time zone,
    completed_at timestamp(6) without time zone,
    cancel_reason character varying(255),
    remark character varying(255),
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL,
    deleted_at timestamp(6) without time zone,
    delivery_type character varying(32),
    pickup_point_id bigint,
    pickup_status character varying(32),
    picked_up_at timestamp(6) without time zone,
    leader_id bigint,
    pickup_code character varying(16)
);


ALTER TABLE public.orders OWNER TO farm;

--
-- Name: orders_id_seq; Type: SEQUENCE; Schema: public; Owner: farm
--

CREATE SEQUENCE public.orders_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.orders_id_seq OWNER TO farm;

--
-- Name: orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: farm
--

ALTER SEQUENCE public.orders_id_seq OWNED BY public.orders.id;


--
-- Name: payment_record; Type: TABLE; Schema: public; Owner: farm
--

CREATE TABLE public.payment_record (
    id bigint NOT NULL,
    pay_no character varying(64) NOT NULL,
    order_no character varying(64) NOT NULL,
    order_id bigint NOT NULL,
    user_id bigint NOT NULL,
    pay_channel smallint NOT NULL,
    amount numeric(18,2) NOT NULL,
    third_trade_no character varying(128),
    pay_status smallint DEFAULT 1 NOT NULL,
    paid_at timestamp(6) without time zone,
    callback_data jsonb,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL
);


ALTER TABLE public.payment_record OWNER TO farm;

--
-- Name: payment_record_id_seq; Type: SEQUENCE; Schema: public; Owner: farm
--

CREATE SEQUENCE public.payment_record_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.payment_record_id_seq OWNER TO farm;

--
-- Name: payment_record_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: farm
--

ALTER SEQUENCE public.payment_record_id_seq OWNED BY public.payment_record.id;


--
-- Name: pickup_point; Type: TABLE; Schema: public; Owner: farm
--

CREATE TABLE public.pickup_point (
    id bigint NOT NULL,
    leader_id bigint,
    name character varying(128) NOT NULL,
    contact_name character varying(64),
    contact_mobile character varying(32),
    province character varying(64) NOT NULL,
    city character varying(64) NOT NULL,
    district character varying(64),
    detail_address character varying(255) NOT NULL,
    longitude numeric(10,7),
    latitude numeric(10,7),
    business_hours character varying(64),
    status character varying(32) DEFAULT 'ENABLED'::character varying NOT NULL,
    source character varying(32) DEFAULT 'ADMIN'::character varying NOT NULL,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL,
    deleted_at timestamp(6) without time zone,
    store_photo character varying(512),
    description character varying(512)
);


ALTER TABLE public.pickup_point OWNER TO farm;

--
-- Name: pickup_point_id_seq; Type: SEQUENCE; Schema: public; Owner: farm
--

CREATE SEQUENCE public.pickup_point_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.pickup_point_id_seq OWNER TO farm;

--
-- Name: pickup_point_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: farm
--

ALTER SEQUENCE public.pickup_point_id_seq OWNED BY public.pickup_point.id;


--
-- Name: point_log; Type: TABLE; Schema: public; Owner: farm
--

CREATE TABLE public.point_log (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    change_type character varying(16) NOT NULL,
    points integer NOT NULL,
    source_type character varying(32) NOT NULL,
    source_no character varying(64),
    remark character varying(255),
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.point_log OWNER TO farm;

--
-- Name: point_log_id_seq; Type: SEQUENCE; Schema: public; Owner: farm
--

CREATE SEQUENCE public.point_log_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.point_log_id_seq OWNER TO farm;

--
-- Name: point_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: farm
--

ALTER SEQUENCE public.point_log_id_seq OWNED BY public.point_log.id;


--
-- Name: product; Type: TABLE; Schema: public; Owner: farm
--

CREATE TABLE public.product (
    id bigint NOT NULL,
    merchant_id bigint NOT NULL,
    category_id bigint NOT NULL,
    title character varying(128) NOT NULL,
    subtitle character varying(255),
    cover_url character varying(255),
    detail_desc text,
    service_tags jsonb,
    trace_info text,
    origin_place character varying(128),
    delivery_type smallint,
    status smallint DEFAULT 1 NOT NULL,
    audit_status smallint DEFAULT 1 NOT NULL,
    audit_remark character varying(255),
    is_pre_sale boolean DEFAULT false NOT NULL,
    is_hot boolean DEFAULT false NOT NULL,
    group_buy_config jsonb,
    brand character varying(64),
    supplier_name character varying(128),
    ingredients text,
    shelf_life character varying(64),
    production_date character varying(64),
    material character varying(128),
    dimensions character varying(128),
    lead_time character varying(64),
    shipping_restricted_regions text,
    after_sales_commitment text,
    logistics_company character varying(128),
    product_nature character varying(32),
    live_cities text,
    session_attribute character varying(64),
    live_mechanism character varying(255),
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL,
    deleted_at timestamp(6) without time zone
);


ALTER TABLE public.product OWNER TO farm;

--
-- Name: product_id_seq; Type: SEQUENCE; Schema: public; Owner: farm
--

CREATE SEQUENCE public.product_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.product_id_seq OWNER TO farm;

--
-- Name: product_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: farm
--

ALTER SEQUENCE public.product_id_seq OWNED BY public.product.id;


--
-- Name: product_image; Type: TABLE; Schema: public; Owner: farm
--

CREATE TABLE public.product_image (
    id bigint NOT NULL,
    product_id bigint NOT NULL,
    image_url character varying(255) NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.product_image OWNER TO farm;

--
-- Name: product_image_id_seq; Type: SEQUENCE; Schema: public; Owner: farm
--

CREATE SEQUENCE public.product_image_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.product_image_id_seq OWNER TO farm;

--
-- Name: product_image_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: farm
--

ALTER SEQUENCE public.product_image_id_seq OWNED BY public.product_image.id;


--
-- Name: product_review; Type: TABLE; Schema: public; Owner: farm
--

CREATE TABLE public.product_review (
    id bigint NOT NULL,
    order_id bigint NOT NULL,
    order_no character varying(64) NOT NULL,
    order_item_id bigint NOT NULL,
    user_id bigint NOT NULL,
    merchant_id bigint NOT NULL,
    product_id bigint NOT NULL,
    sku_id bigint NOT NULL,
    rating smallint NOT NULL,
    content text NOT NULL,
    images jsonb,
    reply_content text,
    replied_at timestamp(6) without time zone,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL,
    deleted_at timestamp(6) without time zone
);


ALTER TABLE public.product_review OWNER TO farm;

--
-- Name: product_review_id_seq; Type: SEQUENCE; Schema: public; Owner: farm
--

CREATE SEQUENCE public.product_review_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.product_review_id_seq OWNER TO farm;

--
-- Name: product_review_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: farm
--

ALTER SEQUENCE public.product_review_id_seq OWNED BY public.product_review.id;


--
-- Name: product_sku; Type: TABLE; Schema: public; Owner: farm
--

CREATE TABLE public.product_sku (
    id bigint NOT NULL,
    product_id bigint NOT NULL,
    sku_name character varying(128) NOT NULL,
    sku_code character varying(64) NOT NULL,
    image_url character varying(255),
    spec_json jsonb,
    price numeric(18,2) NOT NULL,
    original_price numeric(18,2),
    stock integer DEFAULT 0 NOT NULL,
    locked_stock integer DEFAULT 0 NOT NULL,
    weight numeric(10,3),
    status smallint DEFAULT 1 NOT NULL,
    offline_price numeric(18,2),
    safety_stock integer,
    promotion_price numeric(10,2),
    promotion_start_at timestamp(3) without time zone,
    promotion_end_at timestamp(3) without time zone,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL,
    deleted_at timestamp(6) without time zone
);


ALTER TABLE public.product_sku OWNER TO farm;

--
-- Name: product_sku_id_seq; Type: SEQUENCE; Schema: public; Owner: farm
--

CREATE SEQUENCE public.product_sku_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.product_sku_id_seq OWNER TO farm;

--
-- Name: product_sku_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: farm
--

ALTER SEQUENCE public.product_sku_id_seq OWNED BY public.product_sku.id;


--
-- Name: product_trace; Type: TABLE; Schema: public; Owner: farm
--

CREATE TABLE public.product_trace (
    id bigint NOT NULL,
    product_id bigint NOT NULL,
    trace_code character varying(128) NOT NULL,
    trace_desc text,
    trace_json jsonb,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.product_trace OWNER TO farm;

--
-- Name: product_trace_id_seq; Type: SEQUENCE; Schema: public; Owner: farm
--

CREATE SEQUENCE public.product_trace_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.product_trace_id_seq OWNER TO farm;

--
-- Name: product_trace_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: farm
--

ALTER SEQUENCE public.product_trace_id_seq OWNED BY public.product_trace.id;


--
-- Name: product_video; Type: TABLE; Schema: public; Owner: farm
--

CREATE TABLE public.product_video (
    id bigint NOT NULL,
    product_id bigint NOT NULL,
    video_url character varying(255) NOT NULL,
    cover_url character varying(255),
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.product_video OWNER TO farm;

--
-- Name: product_video_id_seq; Type: SEQUENCE; Schema: public; Owner: farm
--

CREATE SEQUENCE public.product_video_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.product_video_id_seq OWNER TO farm;

--
-- Name: product_video_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: farm
--

ALTER SEQUENCE public.product_video_id_seq OWNED BY public.product_video.id;


--
-- Name: qr_code_record; Type: TABLE; Schema: public; Owner: farm
--

CREATE TABLE public.qr_code_record (
    id bigint NOT NULL,
    scene character varying(64) NOT NULL,
    type character varying(8) NOT NULL,
    ref_id bigint NOT NULL,
    inviter_id bigint,
    channel character varying(16),
    image_url character varying(512) NOT NULL,
    status smallint DEFAULT 1 NOT NULL,
    expire_at timestamp(6) without time zone,
    payload jsonb,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL
);


ALTER TABLE public.qr_code_record OWNER TO farm;

--
-- Name: qr_code_record_id_seq; Type: SEQUENCE; Schema: public; Owner: farm
--

CREATE SEQUENCE public.qr_code_record_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.qr_code_record_id_seq OWNER TO farm;

--
-- Name: qr_code_record_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: farm
--

ALTER SEQUENCE public.qr_code_record_id_seq OWNED BY public.qr_code_record.id;


--
-- Name: refund_apply; Type: TABLE; Schema: public; Owner: farm
--

CREATE TABLE public.refund_apply (
    id bigint NOT NULL,
    refund_no character varying(64) NOT NULL,
    order_id bigint NOT NULL,
    order_item_id bigint NOT NULL,
    user_id bigint NOT NULL,
    merchant_id bigint NOT NULL,
    apply_type smallint NOT NULL,
    apply_reason character varying(255) NOT NULL,
    apply_images jsonb,
    refund_amount numeric(18,2) NOT NULL,
    status smallint DEFAULT 1 NOT NULL,
    merchant_remark character varying(255),
    admin_remark character varying(255),
    processed_at timestamp(6) without time zone,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL,
    deleted_at timestamp(6) without time zone
);


ALTER TABLE public.refund_apply OWNER TO farm;

--
-- Name: refund_apply_id_seq; Type: SEQUENCE; Schema: public; Owner: farm
--

CREATE SEQUENCE public.refund_apply_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.refund_apply_id_seq OWNER TO farm;

--
-- Name: refund_apply_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: farm
--

ALTER SEQUENCE public.refund_apply_id_seq OWNED BY public.refund_apply.id;


--
-- Name: region; Type: TABLE; Schema: public; Owner: farm
--

CREATE TABLE public.region (
    id bigint NOT NULL,
    code character varying(12) NOT NULL,
    parent_code character varying(12),
    name character varying(64) NOT NULL,
    short_name character varying(32),
    level smallint NOT NULL,
    full_path character varying(255) NOT NULL,
    pinyin character varying(128),
    latitude numeric(10,6),
    longitude numeric(10,6),
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL
);


ALTER TABLE public.region OWNER TO farm;

--
-- Name: region_id_seq; Type: SEQUENCE; Schema: public; Owner: farm
--

CREATE SEQUENCE public.region_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.region_id_seq OWNER TO farm;

--
-- Name: region_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: farm
--

ALTER SEQUENCE public.region_id_seq OWNED BY public.region.id;


--
-- Name: role; Type: TABLE; Schema: public; Owner: farm
--

CREATE TABLE public.role (
    id bigint NOT NULL,
    code character varying(32) NOT NULL,
    name character varying(64) NOT NULL,
    status smallint DEFAULT 1 NOT NULL,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL
);


ALTER TABLE public.role OWNER TO farm;

--
-- Name: role_id_seq; Type: SEQUENCE; Schema: public; Owner: farm
--

CREATE SEQUENCE public.role_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.role_id_seq OWNER TO farm;

--
-- Name: role_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: farm
--

ALTER SEQUENCE public.role_id_seq OWNED BY public.role.id;


--
-- Name: system_message; Type: TABLE; Schema: public; Owner: farm
--

CREATE TABLE public.system_message (
    id bigint NOT NULL,
    type character varying(32) NOT NULL,
    title character varying(128) NOT NULL,
    summary character varying(255),
    content_type character varying(32) DEFAULT 'JSON'::character varying NOT NULL,
    content_json jsonb,
    cover_image_url character varying(255),
    sender_type character varying(32) DEFAULT 'SYSTEM'::character varying NOT NULL,
    sender_id bigint,
    biz_type character varying(32),
    biz_id character varying(64),
    publish_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    status character varying(32) DEFAULT 'PUBLISHED'::character varying NOT NULL,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL
);


ALTER TABLE public.system_message OWNER TO farm;

--
-- Name: system_message_id_seq; Type: SEQUENCE; Schema: public; Owner: farm
--

CREATE SEQUENCE public.system_message_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.system_message_id_seq OWNER TO farm;

--
-- Name: system_message_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: farm
--

ALTER SEQUENCE public.system_message_id_seq OWNED BY public.system_message.id;


--
-- Name: system_setting; Type: TABLE; Schema: public; Owner: farm
--

CREATE TABLE public.system_setting (
    id bigint NOT NULL,
    key character varying(64) NOT NULL,
    value text NOT NULL,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL
);


ALTER TABLE public.system_setting OWNER TO farm;

--
-- Name: system_setting_id_seq; Type: SEQUENCE; Schema: public; Owner: farm
--

CREATE SEQUENCE public.system_setting_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.system_setting_id_seq OWNER TO farm;

--
-- Name: system_setting_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: farm
--

ALTER SEQUENCE public.system_setting_id_seq OWNED BY public.system_setting.id;


--
-- Name: user; Type: TABLE; Schema: public; Owner: farm
--

CREATE TABLE public."user" (
    id bigint NOT NULL,
    openid character varying(128) NOT NULL,
    account_no character varying(32),
    unionid character varying(128),
    nickname character varying(64),
    avatar_url character varying(255),
    mobile character varying(20),
    gender smallint,
    status smallint DEFAULT 1 NOT NULL,
    last_login_at timestamp(6) without time zone,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL,
    deleted_at timestamp(6) without time zone
);


ALTER TABLE public."user" OWNER TO farm;

--
-- Name: user_address; Type: TABLE; Schema: public; Owner: farm
--

CREATE TABLE public.user_address (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    receiver_name character varying(64) NOT NULL,
    receiver_mobile character varying(20) NOT NULL,
    province character varying(64) NOT NULL,
    city character varying(64) NOT NULL,
    district character varying(64) NOT NULL,
    detail_address character varying(255) NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    region_code character varying(12),
    street_name character varying(64),
    latitude numeric(10,6),
    longitude numeric(10,6),
    tag character varying(16),
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL,
    deleted_at timestamp(6) without time zone
);


ALTER TABLE public.user_address OWNER TO farm;

--
-- Name: user_address_id_seq; Type: SEQUENCE; Schema: public; Owner: farm
--

CREATE SEQUENCE public.user_address_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_address_id_seq OWNER TO farm;

--
-- Name: user_address_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: farm
--

ALTER SEQUENCE public.user_address_id_seq OWNED BY public.user_address.id;


--
-- Name: user_coupon; Type: TABLE; Schema: public; Owner: farm
--

CREATE TABLE public.user_coupon (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    coupon_id bigint NOT NULL,
    status character varying(32) DEFAULT 'RECEIVED'::character varying NOT NULL,
    source_type character varying(32) DEFAULT 'ISSUE'::character varying NOT NULL,
    order_no character varying(64),
    received_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    used_at timestamp(6) without time zone,
    expired_at timestamp(6) without time zone
);


ALTER TABLE public.user_coupon OWNER TO farm;

--
-- Name: user_coupon_id_seq; Type: SEQUENCE; Schema: public; Owner: farm
--

CREATE SEQUENCE public.user_coupon_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_coupon_id_seq OWNER TO farm;

--
-- Name: user_coupon_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: farm
--

ALTER SEQUENCE public.user_coupon_id_seq OWNED BY public.user_coupon.id;


--
-- Name: user_id_seq; Type: SEQUENCE; Schema: public; Owner: farm
--

CREATE SEQUENCE public.user_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_id_seq OWNER TO farm;

--
-- Name: user_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: farm
--

ALTER SEQUENCE public.user_id_seq OWNED BY public."user".id;


--
-- Name: user_message; Type: TABLE; Schema: public; Owner: farm
--

CREATE TABLE public.user_message (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    message_id bigint NOT NULL,
    is_read boolean DEFAULT false NOT NULL,
    read_at timestamp(6) without time zone,
    delivered_at timestamp(6) without time zone,
    deleted_at timestamp(6) without time zone,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL
);


ALTER TABLE public.user_message OWNER TO farm;

--
-- Name: user_message_id_seq; Type: SEQUENCE; Schema: public; Owner: farm
--

CREATE SEQUENCE public.user_message_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_message_id_seq OWNER TO farm;

--
-- Name: user_message_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: farm
--

ALTER SEQUENCE public.user_message_id_seq OWNED BY public.user_message.id;


--
-- Name: user_role; Type: TABLE; Schema: public; Owner: farm
--

CREATE TABLE public.user_role (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    role_id bigint NOT NULL,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.user_role OWNER TO farm;

--
-- Name: user_role_id_seq; Type: SEQUENCE; Schema: public; Owner: farm
--

CREATE SEQUENCE public.user_role_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_role_id_seq OWNER TO farm;

--
-- Name: user_role_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: farm
--

ALTER SEQUENCE public.user_role_id_seq OWNED BY public.user_role.id;


--
-- Name: withdraw_apply; Type: TABLE; Schema: public; Owner: farm
--

CREATE TABLE public.withdraw_apply (
    id bigint NOT NULL,
    merchant_id bigint NOT NULL,
    apply_no character varying(64) NOT NULL,
    amount numeric(18,2) NOT NULL,
    fee numeric(18,2) DEFAULT 0 NOT NULL,
    status smallint DEFAULT 1 NOT NULL,
    audited_by bigint,
    audited_at timestamp(6) without time zone,
    remark character varying(255),
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL
);


ALTER TABLE public.withdraw_apply OWNER TO farm;

--
-- Name: withdraw_apply_id_seq; Type: SEQUENCE; Schema: public; Owner: farm
--

CREATE SEQUENCE public.withdraw_apply_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.withdraw_apply_id_seq OWNER TO farm;

--
-- Name: withdraw_apply_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: farm
--

ALTER SEQUENCE public.withdraw_apply_id_seq OWNED BY public.withdraw_apply.id;


--
-- Name: account_serial id; Type: DEFAULT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.account_serial ALTER COLUMN id SET DEFAULT nextval('public.account_serial_id_seq'::regclass);


--
-- Name: activity id; Type: DEFAULT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.activity ALTER COLUMN id SET DEFAULT nextval('public.activity_id_seq'::regclass);


--
-- Name: activity_draft id; Type: DEFAULT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.activity_draft ALTER COLUMN id SET DEFAULT nextval('public.activity_draft_id_seq'::regclass);


--
-- Name: activity_product id; Type: DEFAULT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.activity_product ALTER COLUMN id SET DEFAULT nextval('public.activity_product_id_seq'::regclass);


--
-- Name: admin_operation_log id; Type: DEFAULT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.admin_operation_log ALTER COLUMN id SET DEFAULT nextval('public.admin_operation_log_id_seq'::regclass);


--
-- Name: admin_role id; Type: DEFAULT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.admin_role ALTER COLUMN id SET DEFAULT nextval('public.admin_role_id_seq'::regclass);


--
-- Name: admin_user id; Type: DEFAULT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.admin_user ALTER COLUMN id SET DEFAULT nextval('public.admin_user_id_seq'::regclass);


--
-- Name: admin_user_role id; Type: DEFAULT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.admin_user_role ALTER COLUMN id SET DEFAULT nextval('public.admin_user_role_id_seq'::regclass);


--
-- Name: banner id; Type: DEFAULT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.banner ALTER COLUMN id SET DEFAULT nextval('public.banner_id_seq'::regclass);


--
-- Name: cart id; Type: DEFAULT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.cart ALTER COLUMN id SET DEFAULT nextval('public.cart_id_seq'::regclass);


--
-- Name: category id; Type: DEFAULT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.category ALTER COLUMN id SET DEFAULT nextval('public.category_id_seq'::regclass);


--
-- Name: chat_conversation id; Type: DEFAULT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.chat_conversation ALTER COLUMN id SET DEFAULT nextval('public.chat_conversation_id_seq'::regclass);


--
-- Name: chat_message id; Type: DEFAULT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.chat_message ALTER COLUMN id SET DEFAULT nextval('public.chat_message_id_seq'::regclass);


--
-- Name: community_leader id; Type: DEFAULT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.community_leader ALTER COLUMN id SET DEFAULT nextval('public.community_leader_id_seq'::regclass);


--
-- Name: coupon id; Type: DEFAULT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.coupon ALTER COLUMN id SET DEFAULT nextval('public.coupon_id_seq'::regclass);


--
-- Name: delivery_record id; Type: DEFAULT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.delivery_record ALTER COLUMN id SET DEFAULT nextval('public.delivery_record_id_seq'::regclass);


--
-- Name: favorite id; Type: DEFAULT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.favorite ALTER COLUMN id SET DEFAULT nextval('public.favorite_id_seq'::regclass);


--
-- Name: feedback id; Type: DEFAULT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.feedback ALTER COLUMN id SET DEFAULT nextval('public.feedback_id_seq'::regclass);


--
-- Name: flash_sale_claim id; Type: DEFAULT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.flash_sale_claim ALTER COLUMN id SET DEFAULT nextval('public.flash_sale_claim_id_seq'::regclass);


--
-- Name: flash_sale_item id; Type: DEFAULT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.flash_sale_item ALTER COLUMN id SET DEFAULT nextval('public.flash_sale_item_id_seq'::regclass);


--
-- Name: flash_sale_window id; Type: DEFAULT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.flash_sale_window ALTER COLUMN id SET DEFAULT nextval('public.flash_sale_window_id_seq'::regclass);


--
-- Name: group_buy id; Type: DEFAULT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.group_buy ALTER COLUMN id SET DEFAULT nextval('public.group_buy_id_seq'::regclass);


--
-- Name: group_buy_member id; Type: DEFAULT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.group_buy_member ALTER COLUMN id SET DEFAULT nextval('public.group_buy_member_id_seq'::regclass);


--
-- Name: leader_application id; Type: DEFAULT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.leader_application ALTER COLUMN id SET DEFAULT nextval('public.leader_application_id_seq'::regclass);


--
-- Name: leader_commission id; Type: DEFAULT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.leader_commission ALTER COLUMN id SET DEFAULT nextval('public.leader_commission_id_seq'::regclass);


--
-- Name: logistics_rule id; Type: DEFAULT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.logistics_rule ALTER COLUMN id SET DEFAULT nextval('public.logistics_rule_id_seq'::regclass);


--
-- Name: merchant id; Type: DEFAULT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.merchant ALTER COLUMN id SET DEFAULT nextval('public.merchant_id_seq'::regclass);


--
-- Name: merchant_delivery_setting id; Type: DEFAULT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.merchant_delivery_setting ALTER COLUMN id SET DEFAULT nextval('public.merchant_delivery_setting_id_seq'::regclass);


--
-- Name: merchant_product_draft id; Type: DEFAULT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.merchant_product_draft ALTER COLUMN id SET DEFAULT nextval('public.merchant_product_draft_id_seq'::regclass);


--
-- Name: merchant_qualification id; Type: DEFAULT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.merchant_qualification ALTER COLUMN id SET DEFAULT nextval('public.merchant_qualification_id_seq'::regclass);


--
-- Name: merchant_wallet id; Type: DEFAULT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.merchant_wallet ALTER COLUMN id SET DEFAULT nextval('public.merchant_wallet_id_seq'::regclass);


--
-- Name: order_item id; Type: DEFAULT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.order_item ALTER COLUMN id SET DEFAULT nextval('public.order_item_id_seq'::regclass);


--
-- Name: orders id; Type: DEFAULT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.orders ALTER COLUMN id SET DEFAULT nextval('public.orders_id_seq'::regclass);


--
-- Name: payment_record id; Type: DEFAULT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.payment_record ALTER COLUMN id SET DEFAULT nextval('public.payment_record_id_seq'::regclass);


--
-- Name: pickup_point id; Type: DEFAULT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.pickup_point ALTER COLUMN id SET DEFAULT nextval('public.pickup_point_id_seq'::regclass);


--
-- Name: point_log id; Type: DEFAULT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.point_log ALTER COLUMN id SET DEFAULT nextval('public.point_log_id_seq'::regclass);


--
-- Name: product id; Type: DEFAULT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.product ALTER COLUMN id SET DEFAULT nextval('public.product_id_seq'::regclass);


--
-- Name: product_image id; Type: DEFAULT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.product_image ALTER COLUMN id SET DEFAULT nextval('public.product_image_id_seq'::regclass);


--
-- Name: product_review id; Type: DEFAULT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.product_review ALTER COLUMN id SET DEFAULT nextval('public.product_review_id_seq'::regclass);


--
-- Name: product_sku id; Type: DEFAULT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.product_sku ALTER COLUMN id SET DEFAULT nextval('public.product_sku_id_seq'::regclass);


--
-- Name: product_trace id; Type: DEFAULT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.product_trace ALTER COLUMN id SET DEFAULT nextval('public.product_trace_id_seq'::regclass);


--
-- Name: product_video id; Type: DEFAULT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.product_video ALTER COLUMN id SET DEFAULT nextval('public.product_video_id_seq'::regclass);


--
-- Name: qr_code_record id; Type: DEFAULT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.qr_code_record ALTER COLUMN id SET DEFAULT nextval('public.qr_code_record_id_seq'::regclass);


--
-- Name: refund_apply id; Type: DEFAULT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.refund_apply ALTER COLUMN id SET DEFAULT nextval('public.refund_apply_id_seq'::regclass);


--
-- Name: region id; Type: DEFAULT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.region ALTER COLUMN id SET DEFAULT nextval('public.region_id_seq'::regclass);


--
-- Name: role id; Type: DEFAULT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.role ALTER COLUMN id SET DEFAULT nextval('public.role_id_seq'::regclass);


--
-- Name: system_message id; Type: DEFAULT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.system_message ALTER COLUMN id SET DEFAULT nextval('public.system_message_id_seq'::regclass);


--
-- Name: system_setting id; Type: DEFAULT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.system_setting ALTER COLUMN id SET DEFAULT nextval('public.system_setting_id_seq'::regclass);


--
-- Name: user id; Type: DEFAULT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public."user" ALTER COLUMN id SET DEFAULT nextval('public.user_id_seq'::regclass);


--
-- Name: user_address id; Type: DEFAULT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.user_address ALTER COLUMN id SET DEFAULT nextval('public.user_address_id_seq'::regclass);


--
-- Name: user_coupon id; Type: DEFAULT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.user_coupon ALTER COLUMN id SET DEFAULT nextval('public.user_coupon_id_seq'::regclass);


--
-- Name: user_message id; Type: DEFAULT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.user_message ALTER COLUMN id SET DEFAULT nextval('public.user_message_id_seq'::regclass);


--
-- Name: user_role id; Type: DEFAULT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.user_role ALTER COLUMN id SET DEFAULT nextval('public.user_role_id_seq'::regclass);


--
-- Name: withdraw_apply id; Type: DEFAULT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.withdraw_apply ALTER COLUMN id SET DEFAULT nextval('public.withdraw_apply_id_seq'::regclass);


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: farm
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
e374f510-c45e-488f-bf71-1bba65c7d5bb	5b39a1e17ac23353e7377d4d6f6bdb39fa03bbd3d8933a68f09cb73b8f15edec	2026-06-28 19:18:12.783386+08	leader_module_init		\N	2026-06-28 19:18:12.783386+08	0
757fee86-3ac4-4285-bdb1-9e1f6ae02d54	4f05733566aab5cac070d60c2cac81bcf144dfa016f303aed49e22fc1a03e25f	\N	20260614_000001_create_chat_support	A migration failed to apply. New migrations cannot be applied before the error is recovered from. Read more about how to resolve migration issues in a production database: https://pris.ly/d/migrate-resolve\n\nMigration name: 20260614_000001_create_chat_support\n\nDatabase error code: 42P07\n\nDatabase error:\nERROR: relation "chat_conversation" already exists\n\nDbError { severity: "ERROR", parsed_severity: Some(Error), code: SqlState(E42P07), message: "relation \\"chat_conversation\\" already exists", detail: None, hint: None, position: None, where_: None, schema: None, table: None, column: None, datatype: None, constraint: None, file: Some("heap.c"), line: Some(1177), routine: Some("heap_create_with_catalog") }\n\n   0: sql_schema_connector::apply_migration::apply_script\n           with migration_name="20260614_000001_create_chat_support"\n             at schema-engine/connectors/sql-schema-connector/src/apply_migration.rs:113\n   1: schema_commands::commands::apply_migrations::Applying migration\n           with migration_name="20260614_000001_create_chat_support"\n             at schema-engine/commands/src/commands/apply_migrations.rs:95\n   2: schema_core::state::ApplyMigrations\n             at schema-engine/core/src/state.rs:255	2026-06-28 19:18:24.358313+08	2026-06-28 19:18:18.310745+08	0
8b05f34c-38a5-4406-8171-5b22715e092d	4f05733566aab5cac070d60c2cac81bcf144dfa016f303aed49e22fc1a03e25f	2026-06-28 19:18:36.173528+08	20260614_000001_create_chat_support		\N	2026-06-28 19:18:36.173528+08	0
a6386baf-6fd5-4d6c-a1f6-8c51dbf439d9	90c8dfa784aa0b37affa58f6e31444a4a97b8514a0cacd30c39159a8cc9e4ff6	2026-06-28 19:18:41.185386+08	20260614_000002_add_chat_scene_fields	\N	\N	2026-06-28 19:18:41.18088+08	1
a16e0e2b-6d96-4a08-8eff-8fab3bd890c8	03a03e50b1fbd1da6faf756f0f4fbd65ec18b04b6e4fd088a874f386fa9d8e28	\N	20260629_000009_community_leader	A migration failed to apply. New migrations cannot be applied before the error is recovered from. Read more about how to resolve migration issues in a production database: https://pris.ly/d/migrate-resolve\n\nMigration name: 20260629_000009_community_leader\n\nDatabase error code: 42710\n\nDatabase error:\nERROR: constraint "community_leader_user_id_fkey" for relation "community_leader" already exists\n\nDbError { severity: "ERROR", parsed_severity: Some(Error), code: SqlState(E42710), message: "constraint \\"community_leader_user_id_fkey\\" for relation \\"community_leader\\" already exists", detail: None, hint: None, position: None, where_: None, schema: None, table: None, column: None, datatype: None, constraint: None, file: Some("tablecmds.c"), line: Some(9794), routine: Some("ATExecAddConstraint") }\n\n   0: sql_schema_connector::apply_migration::apply_script\n           with migration_name="20260629_000009_community_leader"\n             at schema-engine/connectors/sql-schema-connector/src/apply_migration.rs:113\n   1: schema_commands::commands::apply_migrations::Applying migration\n           with migration_name="20260629_000009_community_leader"\n             at schema-engine/commands/src/commands/apply_migrations.rs:95\n   2: schema_core::state::ApplyMigrations\n             at schema-engine/core/src/state.rs:255	2026-06-30 16:25:03.720639+08	2026-06-30 16:22:58.643999+08	0
b8cbde06-90d7-4e37-a8e7-da346fbe7cfb	3c2bc9270484c3ed3b3d26fb25e2fb20a067a1bcac405130732c37b7ea783ad0	2026-06-28 19:18:41.192415+08	20260614_000003_coupon_enhancements	\N	\N	2026-06-28 19:18:41.186261+08	1
ef3da5dc-2ea3-46cf-9f20-8de8ac581bbd	03a03e50b1fbd1da6faf756f0f4fbd65ec18b04b6e4fd088a874f386fa9d8e28	2026-06-30 16:25:03.721901+08	20260629_000009_community_leader		\N	2026-06-30 16:25:03.721901+08	0
ea5ea31c-ad14-42da-a3f4-739196e78f24	3d2f9887e2f331ec3be1599a20f85a722ecfec67520612e591b9d2824504e654	2026-06-28 19:18:41.196504+08	20260614_000004_product_group_buy_config	\N	\N	2026-06-28 19:18:41.193647+08	1
f0379720-7dc9-4076-ac38-94df7c95b26d	fb2f5e4fe6c164c752650b61b1a13882bc10aa446399f35e4f81b32f9370f5d7	2026-06-28 19:18:41.200566+08	20260614_000005_admin_role_permissions	\N	\N	2026-06-28 19:18:41.197403+08	1
99be8fdf-1124-440f-ad08-e792e33ba666	3b23342102219f0238139e27b771e28a8a7d31e0fa797134c060b4119c59f5f2	2026-06-28 19:18:41.226716+08	20260619_000006_api_completion	\N	\N	2026-06-28 19:18:41.201771+08	1
bb91f19a-eb92-4c9c-871b-16f2677ed659	a113a425ee200bbe735efaa8a127012160a3784893d5da5576676d8032ab46a0	2026-06-28 19:18:41.233341+08	20260620_000007_activity_payload_json	\N	\N	2026-06-28 19:18:41.230259+08	1
8595ba51-c8f6-49e2-a814-6d1161686ee3	d8f26d3341f275adb41d85ef63b6b561c0d7ee5389fe69c7ffd1a5d70de6111e	2026-06-28 19:18:41.243087+08	20260620_000008_drop_merchant_freight_template	\N	\N	2026-06-28 19:18:41.234299+08	1
\.


--
-- Data for Name: account_serial; Type: TABLE DATA; Schema: public; Owner: farm
--

COPY public.account_serial (id, scope, date_key, last_value, created_at, updated_at) FROM stdin;
179	USER	20260702	6	2026-07-02 02:36:42.76	2026-07-02 03:06:44.489
185	ADMIN	20260702	1	2026-07-02 03:06:44.499	2026-07-02 03:06:44.499
186	USER	20260703	4	2026-07-03 03:58:45.136	2026-07-03 08:58:55.68
190	ADMIN	20260703	1	2026-07-03 08:58:55.688	2026-07-03 08:58:55.688
57	ADMIN	20260628	5	2026-06-28 11:25:21.719	2026-06-28 12:10:02.379
54	USER	20260628	20	2026-06-28 11:25:21.672	2026-06-28 13:00:14.681
86	ADMIN	20260629	1	2026-06-29 09:39:24.173	2026-06-29 09:39:24.173
4	ADMIN	20260625	4	2026-06-25 05:02:13.536	2026-06-25 15:12:03.323
1	USER	20260625	33	2026-06-25 05:02:11.936	2026-06-25 15:13:55.26
38	USER	20260626	3	2026-06-26 03:18:04.47	2026-06-26 03:29:50.639
79	USER	20260629	18	2026-06-28 18:24:17.439	2026-06-29 15:09:39.525
191	USER	20260709	22	2026-07-09 12:26:18.448	2026-07-09 15:49:21.133
197	ADMIN	20260709	4	2026-07-09 14:04:38.114	2026-07-09 15:49:21.155
41	USER	20260627	13	2026-06-27 05:26:37.875	2026-06-27 06:43:56.554
217	USER	20260710	2	2026-07-09 17:12:19.202	2026-07-09 18:24:58.061
101	ADMIN	20260630	18	2026-06-30 08:22:38.228	2026-06-30 11:02:17.292
98	USER	20260630	63	2026-06-30 08:22:38.155	2026-06-30 11:17:12.753
\.


--
-- Data for Name: activity; Type: TABLE DATA; Schema: public; Owner: farm
--

COPY public.activity (id, activity_name, activity_type, status, start_at, end_at, product_count, rule_json, products_json, created_at, updated_at, deleted_at, merchant_id, remark) FROM stdin;
1	限时秒杀	SECKILL	RUNNING	2026-06-07 10:00:00	2026-06-07 22:00:00	8	\N	\N	2026-06-25 05:02:13.335	2026-06-25 05:02:13.335	\N	\N	\N
3	满减专区	CASHBACK	ENDED	2026-05-28 00:00:00	2026-06-03 23:59:00	11	\N	\N	2026-06-25 05:02:13.335	2026-06-25 05:02:13.335	\N	\N	\N
2	测试拼团111111111	GROUP_BUY	PUBLISHED	2026-06-28 00:00:00	2026-06-29 00:00:00	1	{"type": "GROUP_BUY", "needed": 3, "expireHours": 24, "limitPerUser": 1}	[{"stock": 0, "title": "1111", "coverUrl": "", "productId": 52, "activityPrice": "1", "originalPrice": "11111"}]	2026-06-25 05:02:13.335	2026-06-29 10:06:13.668	\N	\N	\N
\.


--
-- Data for Name: activity_draft; Type: TABLE DATA; Schema: public; Owner: farm
--

COPY public.activity_draft (id, merchant_id, draft_no, title, activity_type, payload_json, updated_at, created_at) FROM stdin;
\.


--
-- Data for Name: activity_product; Type: TABLE DATA; Schema: public; Owner: farm
--

COPY public.activity_product (id, activity_id, product_id, sku_id, activity_price, activity_stock, limit_per_user, sort_order, status, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: admin_operation_log; Type: TABLE DATA; Schema: public; Owner: farm
--

COPY public.admin_operation_log (id, admin_user_id, action, target_type, target_id, content, created_at) FROM stdin;
1	1	LOGIN	系统	\N	{"note": "管理员初始化登录"}	2026-06-25 05:02:13.571
2	1	AUDIT_PRODUCT	商品管理	1	{"result": "APPROVED"}	2026-06-25 05:02:13.571
3	1	LOGIN	系统	1	{"username": "admin"}	2026-06-25 05:05:18.546
4	1	UPDATE_BANNER	Banner管理	2	{"title": "新鲜水果专场", "linkType": "none"}	2026-06-26 03:31:38.205
5	1	LOGIN	系统	1	{"username": "admin"}	2026-06-28 11:28:39.819
6	1	LOGIN	系统	1	{"username": "admin"}	2026-06-29 09:22:10.937
7	1	LOGIN	系统	1	{"username": "admin"}	2026-06-29 09:32:53.024
8	1	UPDATE_ADMIN_ROLE	平台角色	2	{"name": "运营", "roleId": 2, "status": 1}	2026-06-29 09:35:04.043
9	1	UPDATE_ADMIN_ROLE	平台角色	1	{"name": "平台管理员", "roleId": 1, "status": 1}	2026-06-29 09:35:11.503
10	1	UPDATE_ADMIN_ROLE	平台角色	1	{"name": "平台管理员", "roleId": 1, "status": 1}	2026-06-29 09:36:04.518
11	1	UPDATE_ADMIN_ROLE	平台角色	1	{"name": "平台管理员", "roleId": 1, "status": 1}	2026-06-29 09:37:27.387
12	1	UPDATE_ADMIN_ROLE	平台角色	1	{"name": "平台管理员", "roleId": 1, "status": 1}	2026-06-29 09:39:31.285
13	1	LOGIN	系统	1	{"username": "admin"}	2026-06-29 09:39:42.858
14	1	UPDATE_ACTIVITY	活动管理	2	{"activityName": "测试拼团111111111", "activityType": "GROUP_BUY"}	2026-06-29 10:03:24.581
15	1	UPDATE_ACTIVITY	活动管理	2	{"activityName": "测试拼团111111111", "activityType": "GROUP_BUY"}	2026-06-29 10:04:07.671
16	1	UPDATE_ACTIVITY	活动管理	2	{"activityName": "测试拼团111111111", "activityType": "GROUP_BUY"}	2026-06-29 10:05:46.075
17	1	UPDATE_ACTIVITY	活动管理	2	{"activityName": "测试拼团111111111", "activityType": "GROUP_BUY"}	2026-06-29 10:06:13.67
18	1	LOGIN	系统	1	{"username": "admin"}	2026-06-29 12:08:34.181
19	1	LOGIN	系统	1	{"username": "admin"}	2026-06-29 14:57:34.683
20	1	LOGIN	系统	1	{"username": "admin"}	2026-06-29 15:00:10.321
21	1	LOGIN	系统	1	{"username": "admin"}	2026-06-29 15:00:43.16
22	1	LOGIN	系统	1	{"username": "admin"}	2026-06-29 15:00:57.687
23	1	LOGIN	系统	1	{"username": "admin"}	2026-06-29 15:01:10.21
24	1	LOGIN	系统	1	{"username": "admin"}	2026-06-29 15:03:32.064
25	1	LOGIN	系统	1	{"username": "admin"}	2026-06-29 21:12:43.217
26	1	DELETE_BANNER	Banner管理	2	{"title": "新鲜水果专场"}	2026-06-29 21:20:37.977
27	1	LOGIN	系统	1	{"username": "admin"}	2026-06-29 21:27:25.841
28	1	LOGIN	系统	1	{"username": "admin"}	2026-06-29 21:33:46.992
29	1	LOGIN	系统	1	{"username": "admin"}	2026-06-29 21:35:28.677
30	1	LOGIN	系统	1	{"username": "admin"}	2026-06-30 08:54:21.935
31	1	LOGIN	系统	1	{"username": "admin"}	2026-06-30 08:59:19.529
32	1	LOGIN	系统	1	{"username": "admin"}	2026-06-30 08:59:37.44
33	1	LOGIN	系统	1	{"username": "admin"}	2026-06-30 09:01:21.966
34	1	LOGIN	系统	1	{"username": "admin"}	2026-06-30 09:01:37.209
35	1	LOGIN	系统	1	{"username": "admin"}	2026-06-30 18:05:53.218
36	1	LOGIN	系统	1	{"username": "admin"}	2026-07-02 02:41:13.064
37	1	LOGIN	系统	1	{"username": "admin"}	2026-07-02 03:06:44.555
38	1	LOGIN	系统	1	{"username": "admin"}	2026-07-02 08:01:03.605
39	1	REORDER_BANNERS	Banner管理	0	{"bannerIds": [1]}	2026-07-02 08:11:03.534
40	1	REORDER_BANNERS	Banner管理	0	{"bannerIds": [1]}	2026-07-02 08:11:04.527
41	1	UPDATE_BANNER_STATUS	Banner管理	1	{"to": "DISABLED", "from": "ENABLED", "remark": "列表页快速状态切换"}	2026-07-02 08:11:05.982
42	1	UPDATE_BANNER_STATUS	Banner管理	1	{"to": "ENABLED", "from": "DISABLED", "remark": "列表页快速状态切换"}	2026-07-02 08:11:07.051
43	1	UPDATE_BANNER_STATUS	Banner管理	1	{"to": "DISABLED", "from": "ENABLED", "remark": "列表页快速状态切换"}	2026-07-02 08:11:08.631
44	1	UPDATE_BANNER_STATUS	Banner管理	1	{"to": "ENABLED", "from": "DISABLED", "remark": "列表页快速状态切换"}	2026-07-02 08:11:09.757
45	1	UPDATE_USER_STATUS	用户管理	99	{"remark": "列表页禁用用户", "status": 2, "userId": 99}	2026-07-03 02:52:03.87
46	1	UPDATE_USER_STATUS	用户管理	99	{"remark": "列表页恢复用户", "status": 1, "userId": 99}	2026-07-03 02:52:06.691
47	1	UPDATE_USER_STATUS	用户管理	99	{"remark": "列表页禁用用户", "status": 2, "userId": 99}	2026-07-03 02:52:08.907
48	1	UPDATE_USER_STATUS	用户管理	99	{"remark": "列表页恢复用户", "status": 1, "userId": 99}	2026-07-03 02:52:09.641
49	1	ARBITRATE_REFUND	售后仲裁	1	{"action": "reject", "remark": "平台判定驳回退款", "refundNo": "RF202606070001"}	2026-07-03 09:07:37.81
50	1	LOGIN	系统	1	{"username": "admin"}	2026-07-09 13:05:36.069
51	1	UPDATE_USER_STATUS	用户管理	105	{"remark": "列表页禁用用户", "status": 2, "userId": 105}	2026-07-09 13:07:29.97
52	1	UPDATE_USER_STATUS	用户管理	105	{"remark": "列表页恢复用户", "status": 1, "userId": 105}	2026-07-09 13:07:31.843
\.


--
-- Data for Name: admin_role; Type: TABLE DATA; Schema: public; Owner: farm
--

COPY public.admin_role (id, code, name, status, permission_json, created_at, updated_at) FROM stdin;
3	AUDITOR	审核员	1	\N	2026-06-25 05:02:13.544	2026-06-25 05:02:13.544
4	CS	客服	1	\N	2026-06-25 05:02:13.544	2026-06-25 05:02:13.544
2	OPERATOR	运营	1	["dashboard", "analytics", "merchants", "products", "orders", "logistics", "refunds", "chat", "coupons", "activities", "banners", "messages", "users", "admins", "settings"]	2026-06-25 05:02:13.544	2026-06-29 09:35:04.041
1	ADMIN	平台管理员	1	["dashboard", "analytics", "merchants", "products", "orders", "logistics", "refunds", "chat", "coupons", "activities", "banners", "messages", "users", "admins", "settings", "leaders", "pickup-points", "commissions"]	2026-06-25 05:02:13.544	2026-06-29 09:39:31.282
\.


--
-- Data for Name: admin_user; Type: TABLE DATA; Schema: public; Owner: farm
--

COPY public.admin_user (id, username, account_no, password_hash, nickname, mobile, status, last_login_at, created_at, updated_at, deleted_at) FROM stdin;
1	admin	A202606250001	ac0e7d037817094e9e0b4441f9bae3209d67b02fa484917065f71b16109a1a78	平台管理员	13800000001	1	2026-07-09 13:05:36.065	2026-06-25 05:02:13.54	2026-07-09 13:05:36.066	\N
\.


--
-- Data for Name: admin_user_role; Type: TABLE DATA; Schema: public; Owner: farm
--

COPY public.admin_user_role (id, admin_user_id, admin_role_id, created_at) FROM stdin;
1	1	1	2026-06-25 05:02:13.548
\.


--
-- Data for Name: banner; Type: TABLE DATA; Schema: public; Owner: farm
--

COPY public.banner (id, title, image_url, link_type, link_id, start_at, end_at, sort_order, status, created_at, updated_at, deleted_at) FROM stdin;
2	新鲜水果专场	http://124.223.108.180:6004/farm-public/uploads/2026/06/26/1782444694493-36a03e5f-ccad-4b2b-b7b6-6ce6ef208235.jpg	none	\N	\N	\N	2	ENABLED	2026-06-25 05:02:13.331	2026-06-29 21:20:37.975	2026-06-29 21:20:37.975
1	春季产地直发	http://124.223.108.180:6004/farm-public/mock/banner_farm_fresh.png	activity	1	\N	\N	1	ENABLED	2026-06-25 05:02:13.331	2026-07-02 08:11:09.756	\N
\.


--
-- Data for Name: cart; Type: TABLE DATA; Schema: public; Owner: farm
--

COPY public.cart (id, user_id, merchant_id, product_id, sku_id, quantity, checked, created_at, updated_at) FROM stdin;
1	3	1	1	1	1	t	2026-06-25 05:02:13.584	2026-06-25 05:02:13.584
2	3	1	2	2	2	t	2026-06-25 05:02:13.586	2026-06-25 05:02:13.586
\.


--
-- Data for Name: category; Type: TABLE DATA; Schema: public; Owner: farm
--

COPY public.category (id, parent_id, name, icon_url, sort_order, status, created_at, updated_at, deleted_at) FROM stdin;
1	\N	时令果蔬	http://124.223.108.180:6004/farm-public/categories/2026/06/25/1782363731866-e31bbcbd-0377-4a5d-aafb-9fd1a498b621.svg	1	1	2026-06-25 05:02:11.88	2026-06-25 05:02:11.88	\N
3	\N	粮油干货	http://124.223.108.180:6004/farm-public/categories/2026/06/25/1782363731889-656a0ce1-ae45-42a9-abb7-83b9e9623a01.svg	3	1	2026-06-25 05:02:11.894	2026-06-25 05:02:11.894	\N
4	\N	特产礼盒	http://124.223.108.180:6004/farm-public/categories/2026/06/25/1782363731895-f543746b-754d-496c-90d3-aae71923f58b.svg	4	1	2026-06-25 05:02:11.899	2026-06-25 05:02:11.899	\N
5	3	调味品	http://124.223.108.180:6004/farm-public/categories/2026/06/25/1782363731900-07399a4e-4915-4058-ac46-82febaa7e7ad.svg	1	1	2026-06-25 05:02:11.906	2026-06-25 05:02:11.906	\N
6	3	米/面/粉/杂粮	http://124.223.108.180:6004/farm-public/categories/2026/06/25/1782363731907-2575b389-bef9-4487-a8e6-9917af6d0cd1.svg	2	1	2026-06-25 05:02:11.912	2026-06-25 05:02:11.912	\N
7	3	南北干货	http://124.223.108.180:6004/farm-public/categories/2026/06/25/1782363731914-5b5c1ddb-fcb5-4a00-8516-4093c8325795.svg	3	1	2026-06-25 05:02:11.918	2026-06-25 05:02:11.918	\N
8	4	即食海参	http://124.223.108.180:6004/farm-public/categories/2026/06/25/1782363731919-ec8f5ea6-5fc1-447f-ac34-5b8532a36246.svg	1	1	2026-06-25 05:02:11.923	2026-06-25 05:02:11.923	\N
9	4	查干臻品	http://124.223.108.180:6004/farm-public/categories/2026/06/25/1782363731924-9e2067f1-e8fa-4f71-8e09-226827f66587.svg	2	1	2026-06-25 05:02:11.929	2026-06-25 05:02:11.929	\N
2	\N	肉禽蛋奶	\N	2	1	2026-06-25 05:02:11.888	2026-06-25 15:49:59.781985	\N
10	\N	海鲜水产	\N	0	1	2026-06-29 12:37:51.398	2026-06-29 12:37:51.398	\N
\.


--
-- Data for Name: chat_conversation; Type: TABLE DATA; Schema: public; Owner: farm
--

COPY public.chat_conversation (id, conversation_key, buyer_id, merchant_id, product_id, order_no, title, scene_type, scene_label, scene_source, last_message_id, last_message_at, status, created_at, updated_at, deleted_at) FROM stdin;
1	buyer:38|merchant:2	38	2	54	NOb6db57b82b0d	浔源农仓	ORDER	来自订单	订单号 NOb6db57b82b0d	\N	2026-06-27 06:32:12.03	ACTIVE	2026-06-27 06:32:12.03	2026-06-27 06:33:08.413	\N
3	buyer:98|merchant:2	98	2	\N	NOb7273076e419	浔源农仓	ORDER	来自订单	订单号 NOb7273076e419	1	2026-07-02 03:17:28.012	ACTIVE	2026-07-02 03:17:25.215	2026-07-03 02:54:24.616	\N
4	buyer:98|merchant:64	98	64	\N	NO96543ab5fd6b	鹿岛万帝	ORDER	来自订单	订单号 NO96543ab5fd6b	2	2026-07-03 09:06:19.324	ACTIVE	2026-07-03 01:13:25.112	2026-07-03 09:06:19.324	\N
\.


--
-- Data for Name: chat_message; Type: TABLE DATA; Schema: public; Owner: farm
--

COPY public.chat_message (id, conversation_id, sender_id, receiver_id, sender_role, content_type, content, attachments, read_at, created_at, updated_at, deleted_at) FROM stdin;
1	3	98	2	USER	TEXT	1111	\N	\N	2026-07-02 03:17:28.012	2026-07-02 03:17:28.012	\N
2	4	64	98	MERCHANT	TEXT	111	\N	\N	2026-07-03 09:06:19.324	2026-07-03 09:06:19.324	\N
\.


--
-- Data for Name: community_leader; Type: TABLE DATA; Schema: public; Owner: farm
--

COPY public.community_leader (id, user_id, application_no, real_name, mobile, id_card_no, id_card_front_url, id_card_back_url, business_cert_url, status, reject_reason, commission_rate, audited_by, audited_at, created_at, updated_at, deleted_at) FROM stdin;
1	1	LAaea1aba6fbc5	示例团长	13800000000	\N	\N	\N	\N	APPROVED	\N	0.0500	\N	2026-06-28 11:26:40.384	2026-06-28 11:26:40.385	2026-06-28 11:26:40.385	\N
3	61	LAb00a653e1f90	测试姓名	15375757575	123123122231232123	http://124.223.108.180:6004/farm-public/uploads/2026/06/29/1782735139162-16649527-26d5-47f7-a926-732e9372f793.jpg	http://124.223.108.180:6004/farm-public/uploads/2026/06/29/1782735141024-4cbe8f8e-538d-4a32-a9fc-6d7949c8cd19.jpg	http://124.223.108.180:6004/farm-public/uploads/2026/06/29/1782735143663-d5829751-bd65-4ecf-aa8f-f7ae097f7a8f.png	APPROVED	\N	\N	1	2026-06-29 12:13:23.04	2026-06-29 12:12:48.159	2026-06-29 12:13:23.041	\N
4	62	LAbedf3b26bdeb	测试姓名	13800138088	123123123123123123	http://124.223.108.180:6004/farm-public/uploads/2026/06/29/1782735456695-6d9de8ee-059c-44af-bf8a-4f2b640eb78e.jpg	http://124.223.108.180:6004/farm-public/uploads/2026/06/29/1782735458810-a2604851-e780-4564-b0f4-b1de9856afb1.jpg	http://124.223.108.180:6004/farm-public/uploads/2026/06/29/1782735461701-295b7119-e883-49bf-b60b-f0bef5764a7d.jpg	APPROVED	\N	0.0800	1	2026-06-29 12:18:07.083	2026-06-29 12:17:55.422	2026-06-29 15:00:43.638	\N
5	66	LAa0b5b511f3f6	测试团长A-改	13800138088	110101199001011235	\N	\N	\N	APPROVED	\N	0.0800	1	2026-06-29 15:00:43.484	2026-06-29 15:00:43.296	2026-06-29 15:01:10.676	\N
7	68	LA3bc19b7d3fb6	测试团长A-改	13800138003	110101199001011235	\N	\N	\N	APPROVED	\N	\N	1	2026-06-29 15:03:32.398	2026-06-29 15:03:32.225	2026-06-29 15:03:32.398	\N
6	67	LA6d0c42d53b42	测试团长A-改	13800138088	110101199001011235	\N	\N	\N	APPROVED	\N	0.0800	1	2026-06-29 15:01:10.532	2026-06-29 15:01:10.36	2026-06-29 15:03:32.54	\N
2	48	LA4b3d0a3fe970	%E6%B5%8B%E8%AF%95%E5%9B%A2%E9%95%BF	13800138001	\N	\N	\N	\N	DISABLED	\N	0.0500	1	2026-06-28 11:32:35.199	2026-06-28 11:27:46.007	2026-06-30 09:03:10.389	2026-06-30 09:03:10.382
8	94	LAa4463099fbf3	测试111	18708776543	123123444545678908	http://124.223.108.180:6004/farm-public/uploads/2026/06/30/1782817178061-c66c311c-f415-4c01-a78c-18a0ebd853b9.png	http://124.223.108.180:6004/farm-public/uploads/2026/06/30/1782817170963-3554df0c-36b9-40aa-84cb-052f3b48e914.png	http://124.223.108.180:6004/farm-public/uploads/2026/06/30/1782817174521-fb6724f0-d52d-42a2-913f-abf2bd2e9304.png	APPROVED	\N	0.0500	1	2026-06-30 11:15:37.633	2026-06-30 10:59:57.405	2026-06-30 11:15:37.635	\N
9	98	LA842441df6cde	111	18547569586	365898885858569742	http://124.223.108.180:6004/farm-public/uploads/2026/07/02/1782962274090-af4c7973-f601-427e-8491-475f818f810c.png	http://124.223.108.180:6004/farm-public/uploads/2026/07/02/1782962276835-cdcb405c-dc6f-4cee-9d1b-e260238447b4.png	http://124.223.108.180:6004/farm-public/uploads/2026/07/02/1782962279342-8581ce9b-e359-4f7a-b726-b61bacd632ec.png	APPROVED	\N	0.0500	1	2026-07-03 02:59:02.559	2026-07-02 03:18:00.891	2026-07-03 02:59:02.561	\N
10	108	LAb8564c882349	111	18706078989	350725200505096013	http://124.223.108.180:6004/farm-public/uploads/2026/07/09/1783606575503-74f026e6-21d3-4cd0-988d-2233e87bab42.png	http://124.223.108.180:6004/farm-public/uploads/2026/07/09/1783606577766-9fd927f6-238d-4f71-8fa0-e82c51055d2f.png	http://124.223.108.180:6004/farm-public/uploads/2026/07/09/1783606579997-ca99cf54-77d3-4f7f-a153-c97f388167f7.png	APPROVED	\N	0.0500	1	2026-07-09 14:17:02.398	2026-07-09 14:16:50.766	2026-07-09 14:17:02.404	\N
\.


--
-- Data for Name: coupon; Type: TABLE DATA; Schema: public; Owner: farm
--

COPY public.coupon (id, name, type, threshold_amount, discount_amount, stock, issued_stock, valid_start_at, valid_end_at, scope, per_user_limit, rule_json, status, created_at, updated_at, deleted_at) FROM stdin;
4	积分兑换 20 元专区券	CASHBACK	59.00	20.00	200	13	\N	\N	CATEGORY	1	{"exchangeKind": "PRODUCT"}	ENABLED	2026-06-25 05:02:13.568	2026-06-30 11:14:42.353	\N
2	满减券	CASH	99.00	20.00	800	305	\N	\N	ALL	1	\N	ENABLED	2026-06-25 05:02:13.338	2026-07-02 03:16:31.585	\N
1	新人立减券	CASH	50.00	10.00	1000	244	\N	\N	ALL	1	\N	ENABLED	2026-06-25 05:02:13.338	2026-07-02 03:16:32.23	\N
3	积分兑换 10 元券	CASHBACK	0.00	10.00	300	31	\N	\N	ALL	1	{"exchangeKind": "COUPON"}	ENABLED	2026-06-25 05:02:13.568	2026-07-02 03:16:32.906	\N
\.


--
-- Data for Name: delivery_record; Type: TABLE DATA; Schema: public; Owner: farm
--

COPY public.delivery_record (id, order_id, merchant_id, logistics_company, tracking_no, delivery_status, shipped_at, delivered_at, created_at, updated_at) FROM stdin;
1	1	1	默认物流	DLcfdc1cef73fd	2	2026-06-25 05:02:13.402	2026-06-25 05:02:13.402	2026-06-25 05:02:13.403	2026-06-25 05:02:13.403
2	35	11	11	11	2	2026-07-03 06:08:35.308	\N	2026-07-03 06:08:35.308	2026-07-03 06:08:35.308
\.


--
-- Data for Name: favorite; Type: TABLE DATA; Schema: public; Owner: farm
--

COPY public.favorite (id, user_id, product_id, created_at) FROM stdin;
1	1	1	2026-06-25 05:02:13.355
\.


--
-- Data for Name: feedback; Type: TABLE DATA; Schema: public; Owner: farm
--

COPY public.feedback (id, user_id, type, content, images, status, reply, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: flash_sale_claim; Type: TABLE DATA; Schema: public; Owner: farm
--

COPY public.flash_sale_claim (id, item_id, user_id, quantity, order_no, status, created_at, updated_at) FROM stdin;
2	37	94	1	\N	RESERVED	2026-06-30 11:10:55.565	2026-06-30 11:10:55.565
3	37	94	1	\N	RESERVED	2026-06-30 11:11:35.412	2026-06-30 11:11:35.412
4	38	94	1	NO8bcae35cc414	CONVERTED	2026-06-30 11:11:50.96	2026-06-30 11:11:56.16
5	38	94	1	NOd01cbd0ddf51	CONVERTED	2026-06-30 11:13:06.474	2026-06-30 11:13:08.028
\.


--
-- Data for Name: flash_sale_item; Type: TABLE DATA; Schema: public; Owner: farm
--

COPY public.flash_sale_item (id, window_id, product_id, sku_id, flash_price, origin_price, total_stock, stock_left, per_user_limit, created_at, updated_at) FROM stdin;
39	11	3	3	5.94	9.90	100	100	2	2026-06-30 17:23:46.47657	2026-06-30 17:23:46.47657
40	12	4	4	5.94	9.90	100	100	2	2026-06-30 17:23:46.47657	2026-06-30 17:23:46.47657
41	12	5	5	5.94	9.90	100	100	2	2026-06-30 17:23:46.47657	2026-06-30 17:23:46.47657
42	12	6	6	5.94	9.90	100	100	2	2026-06-30 17:23:46.47657	2026-06-30 17:23:46.47657
43	13	7	7	5.94	9.90	100	100	2	2026-06-30 17:23:46.47657	2026-06-30 17:23:46.47657
44	13	8	8	5.94	9.90	100	100	2	2026-06-30 17:23:46.47657	2026-06-30 17:23:46.47657
45	13	9	9	5.94	9.90	100	100	2	2026-06-30 17:23:46.47657	2026-06-30 17:23:46.47657
37	11	1	1	5.94	9.90	100	98	2	2026-06-30 17:23:46.47657	2026-06-30 11:11:35.41
38	11	2	2	5.94	9.90	100	98	2	2026-06-30 17:23:46.47657	2026-06-30 11:13:06.473
\.


--
-- Data for Name: flash_sale_window; Type: TABLE DATA; Schema: public; Owner: farm
--

COPY public.flash_sale_window (id, label, start_at, end_at, status, sort_order, created_at, updated_at) FROM stdin;
12	午间秒杀 12:00	2026-06-30 21:06:51.164354	2026-06-30 23:06:51.164354	UPCOMING	2	2026-06-30 17:23:46.47657	2026-06-30 17:23:46.47657
13	晚市秒杀 20:00	2026-07-01 00:06:51.16523	2026-07-01 02:06:51.16523	UPCOMING	3	2026-06-30 17:23:46.47657	2026-06-30 17:23:46.47657
11	早市秒杀 08:00	2026-06-30 09:10:46.434647	2026-06-30 13:10:46.434647	ACTIVE	1	2026-06-30 17:23:46.47657	2026-06-30 17:23:46.47657
\.


--
-- Data for Name: group_buy; Type: TABLE DATA; Schema: public; Owner: farm
--

COPY public.group_buy (id, group_no, invite_code, product_id, sku_id, initiator_id, group_price, origin_price, needed, status, expire_at, completed_at, rough_area, latitude, longitude, created_at, updated_at) FROM stdin;
9	GBD51C2A70B71145	Y5GAC8	1	1	94	6.93	9.90	3	FAILED	2026-07-01 11:04:16.849	\N	附近	\N	\N	2026-06-30 11:04:16.852	2026-07-01 11:05:00.478
10	GB9E16F9A3AD5749	UGRS5H	1	1	94	6.93	9.90	3	FAILED	2026-07-01 11:05:36.748	\N	附近	\N	\N	2026-06-30 11:05:36.749	2026-07-01 11:06:00.478
11	GBDC70442389F64B	MLSF2W	2	2	94	6.93	9.90	3	FAILED	2026-07-01 11:05:41.969	\N	附近	\N	\N	2026-06-30 11:05:41.97	2026-07-01 11:06:00.481
12	GB198B85D3F1314B	KN8ELF	1	1	94	6.93	9.90	3	FAILED	2026-07-01 11:12:08.905	\N	附近	\N	\N	2026-06-30 11:12:08.906	2026-07-01 11:13:00.48
13	GBBB1858EF8F9C4A	6ZA2L5	2	2	94	6.93	9.90	3	FAILED	2026-07-01 11:12:45.034	\N	附近	\N	\N	2026-06-30 11:12:45.034	2026-07-01 11:13:00.484
14	GB809DC0EC12CD4B	JYJGHR	1	1	94	6.93	9.90	3	FAILED	2026-07-01 11:12:53.455	\N	附近	\N	\N	2026-06-30 11:12:53.455	2026-07-01 11:13:00.487
15	GBBF3E23E9AE5343	TBXAVS	3	3	94	6.93	9.90	3	FAILED	2026-07-01 11:13:16.651	\N	附近	\N	\N	2026-06-30 11:13:16.651	2026-07-01 11:14:00.479
16	GB604437CE29C54F	J4VMSD	3	3	96	6.93	9.90	3	FAILED	2026-07-01 11:22:30.143	\N	附近	\N	\N	2026-06-30 11:22:30.143	2026-07-01 11:23:00.486
6	GB892798DB2E03440BB0BD69BAE5940965	28BBF6	1	1	1	6.93	9.90	3	FAILED	2026-07-01 11:23:07.967368	\N	城东附近	30.510000	114.310000	2026-06-30 17:23:07.967368	2026-07-01 11:24:00.485
7	GB51D21950C2B549F8BFBC6389DFC3399D	4620B6	2	2	1	6.93	9.90	3	FAILED	2026-07-01 11:23:07.967368	\N	城西附近	30.520000	114.320000	2026-06-30 17:23:07.967368	2026-07-01 11:24:00.488
8	GB241DE5F8107B4D089FC8B272356A50D9	CF3EE8	3	3	1	6.93	9.90	3	FAILED	2026-07-01 11:23:07.967368	\N	城南附近	30.530000	114.330000	2026-06-30 17:23:07.967368	2026-07-01 11:24:00.49
17	GB0ADB49D3A7C24C	F9C5LT	3	3	98	6.93	9.90	3	FAILED	2026-07-03 02:37:21.748	\N	附近	\N	\N	2026-07-02 02:37:21.749	2026-07-03 02:37:57.621
\.


--
-- Data for Name: group_buy_member; Type: TABLE DATA; Schema: public; Owner: farm
--

COPY public.group_buy_member (id, group_id, user_id, is_initiator, order_no, joined_at) FROM stdin;
5	6	1	t	\N	2026-06-30 17:23:07.970426
6	7	1	t	\N	2026-06-30 17:23:07.970426
7	8	1	t	\N	2026-06-30 17:23:07.970426
8	9	94	t	\N	2026-06-30 11:04:16.857
9	10	94	t	\N	2026-06-30 11:05:36.752
10	11	94	t	\N	2026-06-30 11:05:41.972
11	12	94	t	\N	2026-06-30 11:12:08.909
12	13	94	t	\N	2026-06-30 11:12:45.037
13	14	94	t	\N	2026-06-30 11:12:53.458
14	15	94	t	NO3fd9f1c2e2d3	2026-06-30 11:13:16.654
15	16	96	t	\N	2026-06-30 11:22:30.145
16	17	98	t	\N	2026-07-02 02:37:21.751
\.


--
-- Data for Name: leader_application; Type: TABLE DATA; Schema: public; Owner: farm
--

COPY public.leader_application (id, user_id, application_no, status, input_json, remark, created_at, updated_at) FROM stdin;
1	98	LA842441df6cde	APPROVED	{"mobile": "18547569586", "idCardNo": "365898885858569742", "realName": "111", "idCardBackUrl": "http://124.223.108.180:6004/farm-public/uploads/2026/07/02/1782962276835-cdcb405c-dc6f-4cee-9d1b-e260238447b4.png", "idCardFrontUrl": "http://124.223.108.180:6004/farm-public/uploads/2026/07/02/1782962274090-af4c7973-f601-427e-8491-475f818f810c.png", "businessCertUrl": "http://124.223.108.180:6004/farm-public/uploads/2026/07/02/1782962279342-8581ce9b-e359-4f7a-b726-b61bacd632ec.png"}	审核通过	2026-07-02 03:18:00.894	2026-07-03 02:59:02.564
2	108	LAb8564c882349	APPROVED	{"mobile": "18706078989", "idCardNo": "350725200505096013", "realName": "111", "idCardBackUrl": "http://124.223.108.180:6004/farm-public/uploads/2026/07/09/1783606577766-9fd927f6-238d-4f71-8fa0-e82c51055d2f.png", "idCardFrontUrl": "http://124.223.108.180:6004/farm-public/uploads/2026/07/09/1783606575503-74f026e6-21d3-4cd0-988d-2233e87bab42.png", "businessCertUrl": "http://124.223.108.180:6004/farm-public/uploads/2026/07/09/1783606579997-ca99cf54-77d3-4f7f-a153-c97f388167f7.png"}	审核通过	2026-07-09 14:16:50.769	2026-07-09 14:17:02.413
\.


--
-- Data for Name: leader_commission; Type: TABLE DATA; Schema: public; Owner: farm
--

COPY public.leader_commission (id, order_no, commission_amount, status, remark, created_at, updated_at, leader_id, order_id, order_amount, commission_rate, settled_at, user_id, bound_leader_id, deleted_at) FROM stdin;
2	NOeee73dd26c74	14.95	SETTLED	系统自动结算	2026-06-29 15:03:33.361	2026-06-29 15:03:33.454	7	14	299.00	0.0500	2026-06-29 15:03:33.453	0	\N	\N
17	NO202606070001	8.30	PENDING_SETTLEMENT	订单分佣	2026-06-30 08:36:31.807	2026-06-30 08:36:31.807	\N	\N	0.00	0.0000	\N	1	\N	\N
18	NO202606070006	12.60	SETTLED	已结算	2026-06-30 08:36:31.807	2026-06-30 08:36:31.807	\N	\N	0.00	0.0000	\N	1	\N	\N
\.


--
-- Data for Name: logistics_rule; Type: TABLE DATA; Schema: public; Owner: farm
--

COPY public.logistics_rule (id, name, province, threshold_amount, freight_amount, active, created_at, updated_at) FROM stdin;
1	同城冷链配送	广东	88.00	0.00	t	2026-06-25 05:02:13.342	2026-06-25 05:02:13.342
2	跨省标准配送	全国	99.00	8.00	t	2026-06-25 05:02:13.342	2026-06-25 05:02:13.342
3	偏远地区附加费	西藏/新疆	199.00	15.00	f	2026-06-25 05:02:13.342	2026-06-25 05:02:13.342
\.


--
-- Data for Name: merchant; Type: TABLE DATA; Schema: public; Owner: farm
--

COPY public.merchant (id, user_id, store_name, store_logo, contact_name, contact_mobile, status, commission_rate, settled_at, created_at, updated_at, deleted_at) FROM stdin;
11	64	鹿岛万帝		鹿岛万帝	18706075626	1	0.0000	\N	2026-06-29 12:37:51.39	2026-07-09 15:21:45.587	\N
1	2	浔源农仓	http://124.223.108.180:6004/farm-public/mock/logo_wanyan_farm.png	平台管理员	19900000000	1	\N	\N	2026-06-25 05:02:11.963	2026-07-09 15:49:21.103	\N
37	108	测试商户	\N	测试联系人	18706075626	1	\N	\N	2026-07-09 23:54:36.274045	2026-07-09 23:54:36.274045	\N
\.


--
-- Data for Name: merchant_delivery_setting; Type: TABLE DATA; Schema: public; Owner: farm
--

COPY public.merchant_delivery_setting (id, merchant_id, sender_name, sender_mobile, sender_address, default_company, cold_chain_enabled, restricted_regions, updated_at, created_at) FROM stdin;
\.


--
-- Data for Name: merchant_product_draft; Type: TABLE DATA; Schema: public; Owner: farm
--

COPY public.merchant_product_draft (id, merchant_id, draft_no, title, cover_url, payload, deleted_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: merchant_qualification; Type: TABLE DATA; Schema: public; Owner: farm
--

COPY public.merchant_qualification (id, merchant_id, qualification_type, file_name, file_url, status, audit_remark, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: merchant_wallet; Type: TABLE DATA; Schema: public; Owner: farm
--

COPY public.merchant_wallet (id, merchant_id, available_balance, frozen_balance, total_income, total_withdrawn, created_at, updated_at) FROM stdin;
6	11	2434.21	0.00	2434.21	0.00	2026-06-29 12:37:51.394	2026-07-02 03:17:18.231
1	1	4986.30	0.00	4986.30	0.00	2026-06-25 05:02:11.968	2026-07-02 03:17:18.232
19	37	0.00	0.00	0.00	0.00	2026-07-09 23:54:36.275866	2026-07-09 23:54:36.275866
\.


--
-- Data for Name: order_item; Type: TABLE DATA; Schema: public; Owner: farm
--

COPY public.order_item (id, order_id, product_id, sku_id, product_title, sku_name, product_image, unit_price, quantity, line_amount, created_at) FROM stdin;
1	1	1	1	吸油纸100张	20张/包*5包	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363731990-9e3e7d67-c8a7-447d-95d9-d5881ce30d23.jpg	39.90	2	79.80	2026-06-25 05:02:13.393
2	3	9	9	竹纤维纸碗50个	10个/包*5包	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363732157-21f03fa9-b49b-4279-9b50-091d89e5f11d.jpg	9.90	1	9.90	2026-06-25 09:01:49.164
3	5	1	1	吸油纸100张	20张/包*5包	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363731990-9e3e7d67-c8a7-447d-95d9-d5881ce30d23.jpg	9.90	1	9.90	2026-06-25 10:02:49.541
4	7	54	54	查干湖冬捕野生胖头鱼大礼包	10斤装（内含5条左右大鱼）	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363732998-30c2b8e4-391b-4609-86a2-d26a4311a9a9.jpg	299.00	1	299.00	2026-06-26 03:17:18.072
5	9	54	54	查干湖冬捕野生胖头鱼大礼包	10斤装（内含5条左右大鱼）	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363732998-30c2b8e4-391b-4609-86a2-d26a4311a9a9.jpg	299.00	2	598.00	2026-06-26 03:18:52.046
6	11	54	54	查干湖冬捕野生胖头鱼大礼包	10斤装（内含5条左右大鱼）	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363732998-30c2b8e4-391b-4609-86a2-d26a4311a9a9.jpg	299.00	2	598.00	2026-06-27 06:32:57.931
7	13	53	53	银耳鲜炖海参	800克/（内含8瓶）	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363732982-7712f444-a5dc-48f9-8283-8327dcd4b803.jpg	359.00	5	1795.00	2026-06-27 06:33:34.123
8	15	54	54	查干湖冬捕野生胖头鱼大礼包	10斤装（内含5条左右大鱼）	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363732998-30c2b8e4-391b-4609-86a2-d26a4311a9a9.jpg	299.00	1	299.00	2026-06-29 15:03:33.248
9	17	57	57	5-6头即食海参尝鲜装	100g左右/只（5-6只） 1斤装	http://124.223.108.180:6004/farm-public/products/1782736671452_2_5-6头即食海参尝鲜装.jpg	759.00	1	759.00	2026-06-30 10:57:57.027
10	19	56	56	8-10头即食海参尝鲜装	55g左右/只（8-10只） 1斤装	http://124.223.108.180:6004/farm-public/products/1782736671439_1_8-10头即食海参尝鲜装.jpg	629.00	1	629.00	2026-06-30 10:58:14.082
11	21	54	54	查干湖冬捕野生胖头鱼大礼包	10斤装（内含5条左右大鱼）	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363732998-30c2b8e4-391b-4609-86a2-d26a4311a9a9.jpg	299.00	1	299.00	2026-06-30 10:58:28.759
12	22	53	53	银耳鲜炖海参	800克/（内含8瓶）	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363732982-7712f444-a5dc-48f9-8283-8327dcd4b803.jpg	359.00	1	359.00	2026-06-30 10:58:28.761
13	23	2	2	烤肉纸100张	20张/包*5包	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363732022-c061dbdf-d889-4a20-868f-3a85c7a03126.jpg	5.94	1	5.94	2026-06-30 11:11:56.155
14	24	2	2	烤肉纸100张	20张/包*5包	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363732022-c061dbdf-d889-4a20-868f-3a85c7a03126.jpg	5.94	1	5.94	2026-06-30 11:13:08.026
15	25	3	3	蒸笼纸100张	20张/包*5包	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363732041-b10c6a16-7ff0-48f5-8b5f-fc9f7fa0005b.jpg	6.93	1	6.93	2026-06-30 11:13:19.358
16	27	26	26	分色加厚纸杯	100只/包	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363732458-a54bd814-f569-435c-a3ea-204ecd99bac8.jpg	9.90	1	9.90	2026-06-30 11:14:14.486
17	29	50	50	五黑海参羹	1488克/（内含6碗）	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363732928-1bd0c95b-22d9-48fd-9218-7a1b0296d0f1.jpg	399.00	1	399.00	2026-06-30 11:14:51.188
18	30	54	54	查干湖冬捕野生胖头鱼大礼包	10斤装（内含5条左右大鱼）	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363732998-30c2b8e4-391b-4609-86a2-d26a4311a9a9.jpg	299.00	1	299.00	2026-06-30 11:14:51.19
19	31	39	39	天麻面500g/包	500g/包*2	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363732696-966c4e25-bcc9-4e0c-9dd8-1ff830daec40.jpg	19.90	1	19.90	2026-06-30 11:14:51.192
20	32	68	68	银耳鲜炖海参	800克/（内含8瓶）	http://124.223.108.180:6004/farm-public/products/1782736671580_13_银耳鲜炖海参.jpg	359.00	1	359.00	2026-06-30 11:14:51.193
21	34	54	54	查干湖冬捕野生胖头鱼大礼包	10斤装（内含5条左右大鱼）	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363732998-30c2b8e4-391b-4609-86a2-d26a4311a9a9.jpg	299.00	1	299.00	2026-07-02 03:17:17.112
22	35	68	68	银耳鲜炖海参	800克/（内含8瓶）	http://124.223.108.180:6004/farm-public/products/1782736671580_13_银耳鲜炖海参.jpg	359.00	2	718.00	2026-07-02 03:17:17.116
\.


--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: farm
--

COPY public.orders (id, order_no, parent_order_no, is_parent, user_id, merchant_id, group_buy_id, address_snapshot, goods_amount, freight_amount, discount_amount, pay_amount, order_status, pay_status, delivery_status, refund_status, expire_at, paid_at, completed_at, cancel_reason, remark, created_at, updated_at, deleted_at, delivery_type, pickup_point_id, pickup_status, picked_up_at, leader_id, pickup_code) FROM stdin;
2	NOcb33ca3fa29f	\N	t	10	1	\N	{"city": "北京市", "district": "东城区", "province": "北京市", "receiverName": "111", "detailAddress": "1111", "receiverMobile": "11111111111"}	9.90	8.00	10.00	7.90	4	0	0	0	2026-06-25 09:31:49.143	\N	\N	订单超时自动取消		2026-06-25 09:01:49.153	2026-06-25 09:32:31.388	\N	\N	\N	\N	\N	\N	\N
3	NO257d2e8b3cb6	NOcb33ca3fa29f	f	10	1	\N	{"city": "北京市", "district": "东城区", "province": "北京市", "receiverName": "111", "detailAddress": "1111", "receiverMobile": "11111111111"}	9.90	8.00	10.00	7.90	4	0	0	0	2026-06-25 09:31:49.143	\N	\N	订单超时自动取消		2026-06-25 09:01:49.164	2026-06-25 09:32:31.388	\N	\N	\N	\N	\N	\N	\N
4	NOa579a616509b	\N	t	15	1	\N	{"city": "深圳", "district": "南山", "province": "广东", "receiverName": "微信用户904A", "detailAddress": "示例路 1 号", "receiverMobile": "13800000000"}	9.90	0.00	0.00	9.90	1	1	0	0	2026-06-25 10:32:49.531	2026-06-25 10:03:02.286	\N	\N	\N	2026-06-25 10:02:49.539	2026-06-25 10:03:02.286	\N	\N	\N	\N	\N	\N	\N
5	NO08c2bdbe9e03	NOa579a616509b	f	15	1	\N	{"city": "深圳", "district": "南山", "province": "广东", "receiverName": "微信用户904A", "detailAddress": "示例路 1 号", "receiverMobile": "13800000000"}	9.90	0.00	0.00	9.90	1	1	0	0	2026-06-25 10:32:49.531	2026-06-25 10:03:02.287	\N	\N	\N	2026-06-25 10:02:49.541	2026-06-25 10:03:02.288	\N	\N	\N	\N	\N	\N	\N
8	NOd055bcb78809	\N	t	29	1	\N	{"city": "北京市", "district": "东城区", "province": "北京市", "receiverName": "11", "detailAddress": "1111111", "receiverMobile": "15559522314"}	598.00	0.00	0.00	598.00	1	1	0	0	2026-06-26 03:48:52.037	2026-06-26 03:18:53.586	\N	\N		2026-06-26 03:18:52.043	2026-06-26 03:18:53.587	\N	\N	\N	\N	\N	\N	\N
9	NO9b90b5396052	NOd055bcb78809	f	29	1	\N	{"city": "北京市", "district": "东城区", "province": "北京市", "receiverName": "11", "detailAddress": "1111111", "receiverMobile": "15559522314"}	598.00	0.00	0.00	598.00	1	1	0	0	2026-06-26 03:48:52.037	2026-06-26 03:18:53.587	\N	\N		2026-06-26 03:18:52.046	2026-06-26 03:18:53.587	\N	\N	\N	\N	\N	\N	\N
6	NO4fc9780dee87	\N	t	27	1	\N	{"city": "北京市", "district": "东城区", "province": "北京市", "receiverName": "11", "detailAddress": "111111111", "receiverMobile": "15595522340"}	299.00	0.00	0.00	299.00	4	0	0	0	2026-06-26 03:47:18.048	\N	\N	订单超时自动取消		2026-06-26 03:17:18.06	2026-06-26 03:48:01.306	\N	\N	\N	\N	\N	\N	\N
7	NOecf64dbae4a0	NO4fc9780dee87	f	27	1	\N	{"city": "北京市", "district": "东城区", "province": "北京市", "receiverName": "11", "detailAddress": "111111111", "receiverMobile": "15595522340"}	299.00	0.00	0.00	299.00	4	0	0	0	2026-06-26 03:47:18.048	\N	\N	订单超时自动取消		2026-06-26 03:17:18.072	2026-06-26 03:48:01.306	\N	\N	\N	\N	\N	\N	\N
10	NO0f4c41815cb0	\N	t	38	1	\N	{"city": "杭州市", "district": "上城区", "province": "浙江省", "receiverName": "1111", "detailAddress": "1111111111", "receiverMobile": "14789562311"}	598.00	0.00	20.00	578.00	1	1	0	0	2026-06-27 07:02:57.918	2026-06-27 06:32:59.475	\N	\N		2026-06-27 06:32:57.927	2026-06-27 06:32:59.475	\N	\N	\N	\N	\N	\N	\N
11	NOb6db57b82b0d	NO0f4c41815cb0	f	38	1	\N	{"city": "杭州市", "district": "上城区", "province": "浙江省", "receiverName": "1111", "detailAddress": "1111111111", "receiverMobile": "14789562311"}	598.00	0.00	20.00	578.00	1	1	0	0	2026-06-27 07:02:57.918	2026-06-27 06:32:59.475	\N	\N		2026-06-27 06:32:57.931	2026-06-27 06:32:59.476	\N	\N	\N	\N	\N	\N	\N
12	NOdc18316c3925	\N	t	38	1	\N	{"city": "杭州市", "district": "上城区", "province": "浙江省", "receiverName": "1111", "detailAddress": "1111111111", "receiverMobile": "14789562311"}	1795.00	0.00	10.00	1785.00	1	1	0	0	2026-06-27 07:03:34.115	2026-06-27 06:33:35.166	\N	\N		2026-06-27 06:33:34.121	2026-06-27 06:33:35.166	\N	\N	\N	\N	\N	\N	\N
13	NO2c308a3cc682	NOdc18316c3925	f	38	1	\N	{"city": "杭州市", "district": "上城区", "province": "浙江省", "receiverName": "1111", "detailAddress": "1111111111", "receiverMobile": "14789562311"}	1795.00	0.00	10.00	1785.00	1	1	0	0	2026-06-27 07:03:34.115	2026-06-27 06:33:35.167	\N	\N		2026-06-27 06:33:34.123	2026-06-27 06:33:35.167	\N	\N	\N	\N	\N	\N	\N
15	NOdd181dba131b	NOeee73dd26c74	f	68	1	\N	{"city": "", "district": "", "province": "", "deliveryType": "SELF_PICKUP", "receiverName": "测试团长A-改", "detailAddress": "待完善", "pickupPointId": 9, "receiverMobile": "13800138003", "pickupPointName": "测试团长A-改 团长自提点"}	299.00	0.00	0.00	299.00	2	1	2	0	2026-06-29 15:33:33.223	2026-06-29 15:03:33.305	\N	\N	\N	2026-06-29 15:03:33.248	2026-06-29 15:03:33.305	\N	SELF_PICKUP	9	PENDING	\N	\N	\N
14	NOeee73dd26c74	\N	t	68	1	\N	{"city": "", "district": "", "province": "", "deliveryType": "SELF_PICKUP", "receiverName": "测试团长A-改", "detailAddress": "待完善", "pickupPointId": 9, "receiverMobile": "13800138003", "pickupPointName": "测试团长A-改 团长自提点"}	299.00	0.00	0.00	299.00	3	1	2	0	2026-06-29 15:33:33.223	2026-06-29 15:03:33.303	2026-06-29 15:03:33.353	\N	\N	2026-06-29 15:03:33.234	2026-06-29 15:03:33.354	\N	SELF_PICKUP	9	PENDING	\N	\N	\N
16	NO7354dd022d0f	\N	t	94	11	\N	{"city": "北京市", "district": "东城区", "province": "北京市", "receiverName": "111", "detailAddress": "1111", "receiverMobile": "12345678911"}	759.00	0.00	0.00	759.00	1	1	0	0	2026-06-30 11:27:57.004	2026-06-30 10:57:58.168	\N	\N		2026-06-30 10:57:57.014	2026-06-30 10:57:58.169	\N	\N	\N	\N	\N	\N	\N
17	NO348bbdf1fa0d	NO7354dd022d0f	f	94	11	\N	{"city": "北京市", "district": "东城区", "province": "北京市", "receiverName": "111", "detailAddress": "1111", "receiverMobile": "12345678911"}	759.00	0.00	0.00	759.00	1	1	0	0	2026-06-30 11:27:57.004	2026-06-30 10:57:58.169	\N	\N		2026-06-30 10:57:57.027	2026-06-30 10:57:58.17	\N	\N	\N	\N	\N	\N	\N
18	NO9364ec4d3366	\N	t	94	11	\N	{"city": "北京市", "district": "东城区", "province": "北京市", "receiverName": "111", "detailAddress": "1111", "receiverMobile": "12345678911"}	629.00	0.00	10.00	619.00	1	1	0	0	2026-06-30 11:28:14.07	2026-06-30 10:58:14.982	\N	\N		2026-06-30 10:58:14.079	2026-06-30 10:58:14.982	\N	\N	\N	\N	\N	\N	\N
19	NO7efb429e1855	NO9364ec4d3366	f	94	11	\N	{"city": "北京市", "district": "东城区", "province": "北京市", "receiverName": "111", "detailAddress": "1111", "receiverMobile": "12345678911"}	629.00	0.00	10.00	619.00	1	1	0	0	2026-06-30 11:28:14.07	2026-06-30 10:58:14.982	\N	\N		2026-06-30 10:58:14.082	2026-06-30 10:58:14.982	\N	\N	\N	\N	\N	\N	\N
20	NO68a001038bd9	\N	t	94	1	\N	{"city": "北京市", "district": "东城区", "province": "北京市", "receiverName": "111", "detailAddress": "1111", "receiverMobile": "12345678911"}	658.00	0.00	0.00	658.00	1	1	0	0	2026-06-30 11:28:28.751	2026-06-30 10:58:29.859	\N	\N		2026-06-30 10:58:28.757	2026-06-30 10:58:29.86	\N	\N	\N	\N	\N	\N	\N
21	NO1598be64190b	NO68a001038bd9	f	94	1	\N	{"city": "北京市", "district": "东城区", "province": "北京市", "receiverName": "111", "detailAddress": "1111", "receiverMobile": "12345678911"}	299.00	0.00	0.00	299.00	1	1	0	0	2026-06-30 11:28:28.751	2026-06-30 10:58:29.86	\N	\N		2026-06-30 10:58:28.759	2026-06-30 10:58:29.86	\N	\N	\N	\N	\N	\N	\N
1	NO5c49af1a0323	\N	f	1	1	\N	{"city": "深圳", "district": "南山", "province": "广东", "receiverName": "示例用户", "detailAddress": "示例路 1 号", "receiverMobile": "13800000000"}	79.80	0.00	0.00	79.80	3	1	2	4	\N	2026-06-25 05:02:13.383	2026-06-25 05:02:13.383	\N	示例订单	2026-06-25 05:02:13.393	2026-07-03 09:07:37.808	\N	\N	\N	\N	\N	\N	\N
22	NO4ae862cf7b6b	NO68a001038bd9	f	94	1	\N	{"city": "北京市", "district": "东城区", "province": "北京市", "receiverName": "111", "detailAddress": "1111", "receiverMobile": "12345678911"}	359.00	0.00	0.00	359.00	1	1	0	0	2026-06-30 11:28:28.751	2026-06-30 10:58:29.86	\N	\N		2026-06-30 10:58:28.761	2026-06-30 10:58:29.86	\N	\N	\N	\N	\N	\N	\N
23	NO8bcae35cc414	\N	f	94	1	\N	{"city": "北京市", "district": "东城区", "province": "北京市", "receiverName": "111", "detailAddress": "1111", "receiverMobile": "12345678911"}	5.94	8.00	0.00	13.94	1	1	0	0	2026-06-30 11:41:56.138	2026-06-30 11:11:57.262	\N	\N		2026-06-30 11:11:56.155	2026-06-30 11:11:57.262	\N	\N	\N	\N	\N	\N	\N
24	NOd01cbd0ddf51	\N	f	94	1	\N	{"city": "北京市", "district": "东城区", "province": "北京市", "receiverName": "111", "detailAddress": "1111", "receiverMobile": "12345678911"}	5.94	8.00	0.00	13.94	1	1	0	0	2026-06-30 11:43:08.018	2026-06-30 11:13:08.962	\N	\N		2026-06-30 11:13:08.026	2026-06-30 11:13:08.962	\N	\N	\N	\N	\N	\N	\N
26	NOacfc4da2a001	\N	t	94	1	\N	{"city": "北京市", "district": "东城区", "province": "北京市", "receiverName": "111", "detailAddress": "1111", "receiverMobile": "12345678911"}	9.90	8.00	0.00	17.90	1	1	0	0	2026-06-30 11:44:14.472	2026-06-30 11:14:15.522	\N	\N		2026-06-30 11:14:14.483	2026-06-30 11:14:15.522	\N	\N	\N	\N	\N	\N	\N
27	NO0c312596310a	NOacfc4da2a001	f	94	1	\N	{"city": "北京市", "district": "东城区", "province": "北京市", "receiverName": "111", "detailAddress": "1111", "receiverMobile": "12345678911"}	9.90	8.00	0.00	17.90	1	1	0	0	2026-06-30 11:44:14.472	2026-06-30 11:14:15.522	\N	\N		2026-06-30 11:14:14.486	2026-06-30 11:14:15.523	\N	\N	\N	\N	\N	\N	\N
28	NO21c19a1e1599	\N	t	94	1	\N	{"city": "北京市", "district": "东城区", "province": "北京市", "receiverName": "111", "detailAddress": "1111", "receiverMobile": "12345678911"}	1076.90	0.00	20.00	1056.90	1	1	0	0	2026-06-30 11:44:51.18	2026-06-30 11:14:52.048	\N	\N		2026-06-30 11:14:51.187	2026-06-30 11:14:52.048	\N	\N	\N	\N	\N	\N	\N
29	NOb5a01cff8870	NO21c19a1e1599	f	94	1	\N	{"city": "北京市", "district": "东城区", "province": "北京市", "receiverName": "111", "detailAddress": "1111", "receiverMobile": "12345678911"}	399.00	0.00	7.41	391.59	1	1	0	0	2026-06-30 11:44:51.18	2026-06-30 11:14:52.048	\N	\N		2026-06-30 11:14:51.188	2026-06-30 11:14:52.048	\N	\N	\N	\N	\N	\N	\N
30	NO99e3564cb623	NO21c19a1e1599	f	94	1	\N	{"city": "北京市", "district": "东城区", "province": "北京市", "receiverName": "111", "detailAddress": "1111", "receiverMobile": "12345678911"}	299.00	0.00	5.55	293.45	1	1	0	0	2026-06-30 11:44:51.18	2026-06-30 11:14:52.048	\N	\N		2026-06-30 11:14:51.19	2026-06-30 11:14:52.048	\N	\N	\N	\N	\N	\N	\N
31	NO99087cccdd2e	NO21c19a1e1599	f	94	1	\N	{"city": "北京市", "district": "东城区", "province": "北京市", "receiverName": "111", "detailAddress": "1111", "receiverMobile": "12345678911"}	19.90	0.00	0.37	19.53	1	1	0	0	2026-06-30 11:44:51.18	2026-06-30 11:14:52.048	\N	\N		2026-06-30 11:14:51.192	2026-06-30 11:14:52.048	\N	\N	\N	\N	\N	\N	\N
32	NO4eb7716c26ae	NO21c19a1e1599	f	94	11	\N	{"city": "北京市", "district": "东城区", "province": "北京市", "receiverName": "111", "detailAddress": "1111", "receiverMobile": "12345678911"}	359.00	0.00	6.67	352.33	1	1	0	0	2026-06-30 11:44:51.18	2026-06-30 11:14:52.048	\N	\N		2026-06-30 11:14:51.193	2026-06-30 11:14:52.048	\N	\N	\N	\N	\N	\N	\N
25	NO3fd9f1c2e2d3	\N	f	94	1	15	{"city": "北京市", "district": "东城区", "province": "北京市", "receiverName": "111", "detailAddress": "1111", "receiverMobile": "12345678911"}	6.93	8.00	0.00	14.93	4	0	0	0	2026-06-30 11:43:19.342	2026-06-30 11:13:20.414	\N	拼团失败自动取消		2026-06-30 11:13:19.358	2026-07-01 11:14:00.486	\N	\N	\N	\N	\N	\N	\N
33	NO6264e0e49e88	\N	t	98	1	\N	{"city": "北京市", "district": "东城区", "province": "北京市", "receiverName": "111", "detailAddress": "11111", "receiverMobile": "18796585626"}	1017.00	0.00	20.00	997.00	1	1	0	0	2026-07-02 03:47:17.09	2026-07-02 03:17:18.227	\N	\N		2026-07-02 03:17:17.101	2026-07-02 03:17:18.228	\N	\N	\N	\N	\N	\N	\N
34	NOb7273076e419	NO6264e0e49e88	f	98	1	\N	{"city": "北京市", "district": "东城区", "province": "北京市", "receiverName": "111", "detailAddress": "11111", "receiverMobile": "18796585626"}	299.00	0.00	5.88	293.12	1	1	0	0	2026-07-02 03:47:17.09	2026-07-02 03:17:18.228	\N	\N		2026-07-02 03:17:17.112	2026-07-02 03:17:18.229	\N	\N	\N	\N	\N	\N	\N
35	NO96543ab5fd6b	NO6264e0e49e88	f	98	11	\N	{"city": "北京市", "district": "东城区", "province": "北京市", "receiverName": "111", "detailAddress": "11111", "receiverMobile": "18796585626"}	718.00	0.00	14.12	703.88	2	1	2	0	2026-07-02 03:47:17.09	2026-07-02 03:17:18.228	\N	\N		2026-07-02 03:17:17.116	2026-07-03 06:08:35.306	\N	\N	\N	\N	\N	\N	\N
\.


--
-- Data for Name: payment_record; Type: TABLE DATA; Schema: public; Owner: farm
--

COPY public.payment_record (id, pay_no, order_no, order_id, user_id, pay_channel, amount, third_trade_no, pay_status, paid_at, callback_data, created_at, updated_at) FROM stdin;
1	PAY1aa516432207	NO5c49af1a0323	1	1	1	79.80	\N	1	2026-06-25 05:02:13.399	\N	2026-06-25 05:02:13.399	2026-06-25 05:02:13.399
2	PAY5939612a1e7d	NOcb33ca3fa29f	2	10	1	7.90	\N	0	\N	\N	2026-06-25 09:01:49.214	2026-06-25 09:01:49.214
3	PAYa375c0330f16	NO257d2e8b3cb6	3	10	1	7.90	\N	0	\N	\N	2026-06-25 09:01:55.824	2026-06-25 09:01:55.824
4	PAY916df0c6688a	NOa579a616509b	4	15	1	9.90	\N	1	2026-06-25 10:03:02.288	{"orderNo": "NOa579a616509b"}	2026-06-25 10:02:57.278	2026-06-25 10:03:02.289
5	PAYceffaf43033d	NO4fc9780dee87	6	27	1	299.00	\N	0	\N	\N	2026-06-26 03:17:18.129	2026-06-26 03:17:18.129
6	PAY8e51d3913802	NOecf64dbae4a0	7	27	1	299.00	\N	0	\N	\N	2026-06-26 03:17:25.232	2026-06-26 03:17:25.232
7	PAY53737ff38f22	NOd055bcb78809	8	29	1	598.00	\N	1	2026-06-26 03:18:53.588	{"orderNo": "NOd055bcb78809"}	2026-06-26 03:18:52.108	2026-06-26 03:18:53.588
8	PAY9b09ae671b4f	NO0f4c41815cb0	10	38	1	578.00	\N	1	2026-06-27 06:32:59.476	{"orderNo": "NO0f4c41815cb0"}	2026-06-27 06:32:57.985	2026-06-27 06:32:59.476
9	PAYa9aa17baf9f6	NOdc18316c3925	12	38	1	1785.00	\N	1	2026-06-27 06:33:35.167	{"orderNo": "NOdc18316c3925"}	2026-06-27 06:33:34.178	2026-06-27 06:33:35.167
10	PAY4f64329623d7	NO7354dd022d0f	16	94	1	759.00	\N	1	2026-06-30 10:57:58.17	{"orderNo": "NO7354dd022d0f"}	2026-06-30 10:57:57.079	2026-06-30 10:57:58.17
11	PAYbb482d2fc67c	NO9364ec4d3366	18	94	1	619.00	\N	1	2026-06-30 10:58:14.983	{"orderNo": "NO9364ec4d3366"}	2026-06-30 10:58:14.133	2026-06-30 10:58:14.983
12	PAY878d316011d7	NO68a001038bd9	20	94	1	658.00	\N	1	2026-06-30 10:58:29.861	{"orderNo": "NO68a001038bd9"}	2026-06-30 10:58:28.803	2026-06-30 10:58:29.861
13	PAY5d7a17e02911	NO8bcae35cc414	23	94	1	13.94	\N	1	2026-06-30 11:11:57.263	{"orderNo": "NO8bcae35cc414"}	2026-06-30 11:11:56.212	2026-06-30 11:11:57.264
14	PAYc0df62d45764	NOd01cbd0ddf51	24	94	1	13.94	\N	1	2026-06-30 11:13:08.962	{"orderNo": "NOd01cbd0ddf51"}	2026-06-30 11:13:08.081	2026-06-30 11:13:08.963
15	PAY4717a69d75f8	NO3fd9f1c2e2d3	25	94	1	14.93	\N	1	2026-06-30 11:13:20.414	{"orderNo": "NO3fd9f1c2e2d3"}	2026-06-30 11:13:19.416	2026-06-30 11:13:20.414
16	PAY02a383353bc5	NOacfc4da2a001	26	94	1	17.90	\N	1	2026-06-30 11:14:15.524	{"orderNo": "NOacfc4da2a001"}	2026-06-30 11:14:14.555	2026-06-30 11:14:15.524
17	PAY206454b7f3a8	NO21c19a1e1599	28	94	1	1056.90	\N	1	2026-06-30 11:14:52.049	{"orderNo": "NO21c19a1e1599"}	2026-06-30 11:14:51.241	2026-06-30 11:14:52.049
18	PAY385bd3ae236a	NO6264e0e49e88	33	98	1	997.00	\N	1	2026-07-02 03:17:18.229	{"orderNo": "NO6264e0e49e88"}	2026-07-02 03:17:17.184	2026-07-02 03:17:18.23
\.


--
-- Data for Name: pickup_point; Type: TABLE DATA; Schema: public; Owner: farm
--

COPY public.pickup_point (id, leader_id, name, contact_name, contact_mobile, province, city, district, detail_address, longitude, latitude, business_hours, status, source, created_at, updated_at, deleted_at, store_photo, description) FROM stdin;
1	1	示例团长自提点（南山店）	示例团长	13800000000	广东	深圳	南山	示例路 1 号	113.9430000	22.5230000	09:00 - 21:00	ENABLED	LEADER	2026-06-28 11:26:40.393	2026-06-28 11:26:40.393	\N	\N	\N
4	3	测试姓名 团长自提点	测试姓名	15375757575			\N	待完善	\N	\N	\N	ENABLED	LEADER	2026-06-29 12:13:23.051	2026-06-29 12:13:23.051	\N	\N	\N
5	4	测试姓名 团长自提点	测试姓名	15312312312			\N	待完善	\N	\N	\N	ENABLED	LEADER	2026-06-29 12:18:07.089	2026-06-29 12:18:07.089	\N	\N	\N
6	5	测试团长A-改 团长自提点	测试团长A-改	13800138003			\N	待完善	\N	\N	\N	ENABLED	LEADER	2026-06-29 15:00:43.496	2026-06-29 15:00:43.496	\N	\N	\N
7	6	测试团长A-改 团长自提点	测试团长A-改	13800138003			\N	待完善	\N	\N	\N	ENABLED	LEADER	2026-06-29 15:01:10.537	2026-06-29 15:01:10.537	\N	\N	\N
9	7	测试团长A-改 团长自提点	测试团长A-改	13800138003			\N	待完善	\N	\N	\N	ENABLED	LEADER	2026-06-29 15:03:32.403	2026-06-29 15:19:31.157	\N	\N	\N
3	\N	%E6%B5%8B%E8%AF%95%E8%87%AA%E6%8F%90%E7%82%B9	\N	\N	%E5%B9%BF%E4%B8%9C	%E6%B7%B1%E5%9C%B3	%E5%8D%97%E5%B1%B1	%E7%A7%91%E6%8A%80%E5%9B%AD%E8%B7%AF%201%20%E5%8F%B7	113.9430000	22.5230000	09:00-21:00	DISABLED	ADMIN	2026-06-28 11:29:47.955	2026-06-30 09:02:53.312	2026-06-30 09:02:53.311	\N	\N
11	8	测试	测试111	18708776543	北京市	北京市	东城区	111111111	\N	\N	8.30-16.30	ENABLED	LEADER	2026-06-30 11:16:20.712	2026-06-30 11:16:20.712	\N	http://124.223.108.180:6004/farm-public/uploads/2026/06/30/1782818179069-a9e889a9-e1ea-4171-89c7-8f48cab15238.png	1111111
\.


--
-- Data for Name: point_log; Type: TABLE DATA; Schema: public; Owner: farm
--

COPY public.point_log (id, user_id, change_type, points, source_type, source_no, remark, created_at) FROM stdin;
1	1	EARN	120	ORDER	NO202606070001	订单完成奖励	2026-06-07 10:00:00
2	1	DEDUCT	-20	REFUND	RF202606070001	售后扣回积分	2026-06-07 12:00:00
3	3	INCREASE	128	ORDER	NO202606070001	下单奖励	2026-06-25 05:02:13.574
4	3	INCREASE	80	REGISTER	REG202606070001	新用户注册奖励	2026-06-25 05:02:13.574
5	68	EARN	299	ORDER	NOeee73dd26c74	订单完成奖励	2026-06-29 15:03:33.357
\.


--
-- Data for Name: product; Type: TABLE DATA; Schema: public; Owner: farm
--

COPY public.product (id, merchant_id, category_id, title, subtitle, cover_url, detail_desc, service_tags, trace_info, origin_place, delivery_type, status, audit_status, audit_remark, is_pre_sale, is_hot, group_buy_config, brand, supplier_name, ingredients, shelf_life, production_date, material, dimensions, lead_time, shipping_restricted_regions, after_sales_commitment, logistics_company, product_nature, live_cities, session_attribute, live_mechanism, created_at, updated_at, deleted_at) FROM stdin;
4	1	2	空气炸锅纸100片(吸塑装)	厨房日用精选 | 100片/盒	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363732061-479abbb5-59f0-4192-b2db-6731f3cbc834.jpg	尺寸: （160mm*45mm） | 材质: 食品级双重硅油纸 | 保质期: 4年 | 生产日期: 2026年1月后	\N	\N	黑龙江牡丹江	1	1	2	\N	f	f	\N	家用精选	\N	\N	4年	2026年1月后	食品级双重硅油纸	（160mm*45mm）	\N	\N	\N	\N	福利品	\N	\N	\N	2026-06-25 05:02:12.076	2026-06-25 05:02:12.076	\N
5	1	2	铝箔纸7寸圆100个	厨房日用精选 | 20个/盒*5盒	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363732083-e5a78486-403b-4cbc-befb-0c9f9e53a32f.jpg	尺寸: （185mm*45mm) | 材质: 食品级铝箔 | 保质期: 4年 | 生产日期: 2026年1月后	\N	\N	四川成都	1	1	2	\N	f	f	\N	家用精选	\N	\N	4年	2026年1月后	食品级铝箔	（185mm*45mm)	\N	\N	\N	\N	福利品	\N	\N	\N	2026-06-25 05:02:12.095	2026-06-25 05:02:12.095	\N
6	1	2	PS功夫茶杯200只（60ml）袋装	厨房日用精选 | 50只/包*4包	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363732103-6508c4c1-816d-4ced-9565-39f979a4baee.jpg	尺寸: 60ml | 材质: PS（聚苯乙烯） | 保质期: 5年 | 生产日期: 2026年1月后	\N	\N	黑龙江牡丹江	1	1	2	\N	f	f	\N	家用精选	\N	\N	5年	2026年1月后	PS（聚苯乙烯）	60ml	\N	\N	\N	\N	福利品	\N	\N	\N	2026-06-25 05:02:12.113	2026-06-25 05:02:12.113	\N
7	1	2	PS功夫茶杯160只（60ml）桶装	厨房日用精选 | 40只/桶*4桶	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363732121-00fefb0d-d43a-4ca0-889a-c2d1b0e351db.jpg	尺寸: 60ml | 材质: PS（聚苯乙烯） | 保质期: 5年 | 生产日期: 2026年1月后	\N	\N	山东寿光	1	1	2	\N	f	f	\N	家用精选	\N	\N	5年	2026年1月后	PS（聚苯乙烯）	60ml	\N	\N	\N	\N	福利品	\N	\N	\N	2026-06-25 05:02:12.128	2026-06-25 05:02:12.128	\N
8	1	2	一次性塑杯200个	厨房日用精选 | 50只/包*4包	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363732140-9f8a8ed2-0c34-45fe-84f2-5900d4bc57e6.jpg	尺寸: 200ml | 材质: 聚丙烯（pp） | 保质期: 5年 | 生产日期: 2026年1月后	\N	\N	黑龙江牡丹江	1	1	2	\N	f	f	\N	家用精选	\N	\N	5年	2026年1月后	聚丙烯（pp）	200ml	\N	\N	\N	\N	福利品	\N	\N	\N	2026-06-25 05:02:12.15	2026-06-25 05:02:12.15	\N
9	1	2	竹纤维纸碗50个	厨房日用精选 | 10个/包*5包	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363732157-21f03fa9-b49b-4279-9b50-091d89e5f11d.jpg	尺寸: 520ml | 材质: 原纸+聚乙烯 | 保质期: 5年 | 生产日期: 2026年1月后	\N	\N	四川成都	1	1	2	\N	f	f	\N	家用精选	\N	\N	5年	2026年1月后	原纸+聚乙烯	520ml	\N	\N	\N	\N	福利品	\N	\N	\N	2026-06-25 05:02:12.165	2026-06-25 05:02:12.165	\N
10	1	2	PE保鲜罩(带盖装)400只	厨房日用精选 | 200只/包*2包	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363732172-20559ad0-b3c0-49fa-b291-14a84a743ac3.jpg	尺寸: 拉伸长度约：40cm | 材质: 91PE聚乙烯 | 保质期: 5年 | 生产日期: 2026年1月后	\N	\N	山东寿光	1	1	2	\N	f	f	\N	家用精选	\N	\N	5年	2026年1月后	91PE聚乙烯	拉伸长度约：40cm	\N	\N	\N	\N	福利品	\N	\N	\N	2026-06-25 05:02:12.183	2026-06-25 05:02:12.183	\N
11	1	2	一次性塑杯100个（加厚款）	厨房日用精选 | 50只/包*2包	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363732190-c5f93c58-88d2-4518-aa17-906cb170753f.jpg	尺寸: 200ml | 材质: 聚丙烯（pp） | 保质期: 5年 | 生产日期: 2026年1月后	\N	\N	山东寿光	1	1	2	\N	f	f	\N	家用精选	\N	\N	5年	2026年1月后	聚丙烯（pp）	200ml	\N	\N	\N	\N	福利品	\N	\N	\N	2026-06-25 05:02:12.202	2026-06-25 05:02:12.202	\N
12	1	2	一次性束口桌套	厨房日用精选 | 10只/包*2包\n（红色/白色）	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363732209-a4efcd5c-4701-4a11-88c4-201a8db83bca.jpg	尺寸: 拉伸长度约：2.5米 | 材质: PE聚乙烯 | 保质期: 5年 | 生产日期: 2026年1月后	\N	\N	福建厦门	1	1	2	\N	f	f	\N	家用精选	\N	\N	5年	2026年1月后	PE聚乙烯	拉伸长度约：2.5米	\N	\N	\N	\N	福利品	\N	\N	\N	2026-06-25 05:02:12.222	2026-06-25 05:02:12.222	\N
13	1	2	竹纤维本色纸杯200个装	厨房日用精选 | 50个/包*4包	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363732229-6b24fdee-9cdd-4b32-9b4b-7aff588f226a.jpg	尺寸: 235ml | 材质: 原生纸+聚乙烯\n（接触食品层材质） | 保质期: 5年 | 生产日期: 2026年1月后	\N	\N	黑龙江牡丹江	1	1	2	\N	f	f	\N	家用精选	\N	\N	5年	2026年1月后	原生纸+聚乙烯\n（接触食品层材质）	235ml	\N	\N	\N	\N	福利品	\N	\N	\N	2026-06-25 05:02:12.24	2026-06-25 05:02:12.24	\N
14	1	2	一次性PE手套	厨房日用精选 | 100只/包*3包\n（均码）	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363732246-2c277170-31cd-43ac-b7fe-ecd7dce7fbf4.jpg	尺寸: 长度约：27cm | 材质: PE聚乙烯 | 保质期: 5年 | 生产日期: 2026年1月后	\N	\N	云南昭通	1	1	2	\N	f	f	\N	家用精选	\N	\N	5年	2026年1月后	PE聚乙烯	长度约：27cm	\N	\N	\N	\N	福利品	\N	\N	\N	2026-06-25 05:02:12.257	2026-06-25 05:02:12.257	\N
15	1	2	蒸笼纸150张	厨房日用精选 | 50张/包*3包	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363732264-75a7029f-c005-479f-b0da-a5e1566ef3dc.jpg	尺寸: 直径10cm | 材质: 双面硅油纸（食品级） | 保质期: 5年 | 生产日期: 2026年1月后	\N	\N	山东寿光	1	1	2	\N	f	f	\N	家用精选	\N	\N	5年	2026年1月后	双面硅油纸（食品级）	直径10cm	\N	\N	\N	\N	福利品	\N	\N	\N	2026-06-25 05:02:12.278	2026-06-25 05:02:12.278	\N
16	1	2	一次性保鲜袋2卷	厨房日用精选 | 100只/卷*2卷	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363732285-8c897068-301f-4e03-8fb6-bf398a8e7948.jpg	尺寸: 30*40cm | 材质: 共混物【乙烯与1-丁烯的聚合物、\n聚乙烯（乙烯均聚物）】 | 保质期: 4年 | 生产日期: 2026年1月后	\N	\N	福建厦门	1	1	2	\N	f	f	\N	家用精选	\N	\N	4年	2026年1月后	共混物【乙烯与1-丁烯的聚合物、\n聚乙烯（乙烯均聚物）】	30*40cm	\N	\N	\N	\N	福利品	\N	\N	\N	2026-06-25 05:02:12.292	2026-06-25 05:02:12.292	\N
17	1	2	一次性PE保鲜罩400只	厨房日用精选 | 100只/包*4包	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363732299-ceb8a9c8-07bc-4fc6-aae0-05d337c786da.jpg	尺寸: 拉伸长度约：40cm | 材质: 91PE聚乙烯 | 保质期: 5年 | 生产日期: 2026年1月后	\N	\N	广西南宁	1	1	2	\N	f	f	\N	家用精选	\N	\N	5年	2026年1月后	91PE聚乙烯	拉伸长度约：40cm	\N	\N	\N	\N	福利品	\N	\N	\N	2026-06-25 05:02:12.311	2026-06-25 05:02:12.311	\N
18	1	2	铝箔方盘24个	厨房日用精选 | 6只/盒*4盒	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363732318-93ad8018-cddf-41a9-8d45-ef99d08e65eb.jpg	尺寸: 22*16*5cm | 材质: 食品级铝箔 | 保质期: 4年 | 生产日期: 2026年1月后	\N	\N	四川成都	1	1	2	\N	f	f	\N	家用精选	\N	\N	4年	2026年1月后	食品级铝箔	22*16*5cm	\N	\N	\N	\N	福利品	\N	\N	\N	2026-06-25 05:02:12.329	2026-06-25 05:02:12.329	\N
19	1	2	PE保鲜膜2卷	厨房日用精选 | 80米/卷*2卷	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363732336-c84986e4-3059-4aa6-b614-4114368776d8.jpg	尺寸: 30cm*80m | 材质: 共混物【乙烯与1-丁烯的聚合物、\n聚乙烯（乙烯均聚物）】 | 保质期: 4年 | 生产日期: 2026年1月后	\N	\N	四川成都	1	1	2	\N	f	f	\N	家用精选	\N	\N	4年	2026年1月后	共混物【乙烯与1-丁烯的聚合物、\n聚乙烯（乙烯均聚物）】	30cm*80m	\N	\N	\N	\N	福利品	\N	\N	\N	2026-06-25 05:02:12.344	2026-06-25 05:02:12.344	\N
20	1	2	免洗组合餐具套装	厨房日用精选 | 1盒\n（内含：碗10只+杯10只+勺10只+筷10双+桌布1张+收纳袋2只）	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363732351-e817b8ec-b6a7-433e-88fe-98b601338b49.jpg	尺寸: 碗（300ml)\n杯（170ml） | 材质: 碗、杯、勺\n【PP（聚丙烯）】\n筷：毛竹 | 保质期: 5年 | 生产日期: 2025年10月后	\N	\N	山东寿光	1	1	2	\N	f	f	\N	家用精选	\N	\N	5年	2025年10月后	碗、杯、勺\n【PP（聚丙烯）】\n筷：毛竹	碗（300ml)\n杯（170ml）	\N	\N	\N	\N	福利品	\N	\N	\N	2026-06-25 05:02:12.358	2026-06-25 05:02:12.358	\N
21	1	2	餐具10人餐组合套装	厨房日用精选 | 1包\n（内含：碗10只+杯10只+筷10双+牙签10支+碟10个+勺10个+台布1张	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363732365-bcf07352-df75-4745-a68c-970124909d98.jpg	材质: PP（丙烯均聚物），竹筷+竹牙签（竹） | 保质期: 5年 | 生产日期: 2025年10月后	\N	\N	云南昭通	1	1	2	\N	f	f	\N	家用精选	\N	\N	5年	2025年10月后	PP（丙烯均聚物），竹筷+竹牙签（竹）	\N	\N	\N	\N	\N	福利品	\N	\N	\N	2026-06-25 05:02:12.378	2026-06-25 05:02:12.378	\N
22	1	2	餐具组合套装	厨房日用精选 | 1包\n（内含：10碗 10杯 10筷子\n 10牙签  ） 	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363732385-9e1ad213-4d8c-482a-89fd-3cdb9265289e.jpg	材质: 原生纸+聚乙烯(接触食品材质)，竹筷+竹牙签(竹) | 保质期: 5年 | 生产日期: 2025年10月后	\N	\N	山东寿光	1	1	2	\N	f	f	\N	家用精选	\N	\N	5年	2025年10月后	原生纸+聚乙烯(接触食品材质)，竹筷+竹牙签(竹)	\N	\N	\N	\N	\N	福利品	\N	\N	\N	2026-06-25 05:02:12.397	2026-06-25 05:02:12.397	\N
23	1	2	粘毛除尘套装	厨房日用精选 | 1包\n（11件套：10卷粘纸+1把手柄）	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363732404-2996001d-25d8-4c43-b508-d0ec10256fd2.jpg	尺寸: 宽10CM\n(10卷*20撕) | 材质: 纸+合成胶类+PP | 保质期: 5年 | 生产日期: 2025年10月后	\N	\N	四川成都	1	1	2	\N	f	f	\N	家用精选	\N	\N	5年	2025年10月后	纸+合成胶类+PP	宽10CM\n(10卷*20撕)	\N	\N	\N	\N	福利品	\N	\N	\N	2026-06-25 05:02:12.417	2026-06-25 05:02:12.417	\N
24	1	2	一次性发泡烟灰缸	厨房日用精选 | 25只/盒*2盒	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363732425-97c74683-bd5d-43a4-8115-ccbffdd84f5c.jpg	尺寸: 9cm（直径） | 材质: 原纸+聚乙烯+吸水树脂 | 保质期: 5年 | 生产日期: 2025年10月后	\N	\N	云南昭通	1	1	2	\N	f	f	\N	家用精选	\N	\N	5年	2025年10月后	原纸+聚乙烯+吸水树脂	9cm（直径）	\N	\N	\N	\N	福利品	\N	\N	\N	2026-06-25 05:02:12.435	2026-06-25 05:02:12.435	\N
25	1	2	水果竹节叉	厨房日用精选 | 100只/桶*2桶	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363732443-5f422369-1aa7-4560-b618-c65b4dafcd55.jpg	尺寸: 10.5cm | 材质: 聚苯乙烯(PS) | 保质期: 5年 | 生产日期: 2025年7月后	\N	\N	山东寿光	1	1	2	\N	f	f	\N	家用精选	\N	\N	5年	2025年7月后	聚苯乙烯(PS)	10.5cm	\N	\N	\N	\N	福利品	\N	\N	\N	2026-06-25 05:02:12.451	2026-06-25 05:02:12.451	\N
26	1	2	分色加厚纸杯	厨房日用精选 | 100只/包	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363732458-a54bd814-f569-435c-a3ea-204ecd99bac8.jpg	尺寸: 235ml | 材质: 原生纸+聚乙烯(接触食品级材质) | 保质期: 5年 | 生产日期: 2025年7月后	\N	\N	福建厦门	1	1	2	\N	f	f	\N	家用精选	\N	\N	5年	2025年7月后	原生纸+聚乙烯(接触食品级材质)	235ml	\N	\N	\N	\N	福利品	\N	\N	\N	2026-06-25 05:02:12.467	2026-06-25 05:02:12.467	\N
27	1	5	热人心优级黄冰糖500g	热人心 直播特惠福利商品	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363732473-89038e91-6960-4522-b82a-0ea6852162c1.jpg	品牌: 热人心 | 规格: 500g黄冰糖1袋 | 适合场次: None	\N	\N	广西南宁	1	1	2	\N	f	f	\N	热人心	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	福利品	\N	\N	500g黄冰糖1袋	2026-06-25 05:02:12.485	2026-06-25 05:02:12.485	\N
28	1	5	暖人心玉米淀粉100g	暖人心 直播特惠福利商品	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363732492-fd0c3d67-26a4-44d1-ad58-d2d25a081cdd.jpg	品牌: 暖人心 | 规格: 100g玉米淀粉8袋 | 适合场次: None	\N	\N	黑龙江牡丹江	1	1	2	\N	f	f	\N	暖人心	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	福利品	\N	\N	100g玉米淀粉8袋	2026-06-25 05:02:12.504	2026-06-25 05:02:12.504	\N
29	1	6	热人心燕窝银耳豆浆粉	热人心 直播特惠福利商品	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363732511-1f836f74-fce1-4631-893d-a7470db2ca18.jpg	品牌: 热人心 | 规格: 500g燕窝银耳豆浆粉1罐 | 适合场次: None	\N	\N	山东寿光	1	1	2	\N	f	f	\N	热人心	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	福利品	\N	\N	500g燕窝银耳豆浆粉1罐	2026-06-25 05:02:12.522	2026-06-25 05:02:12.522	\N
30	1	6	热人心燕窝核桃五黑粉	热人心 直播特惠福利商品	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363732529-b753dd92-6359-4a5e-97a2-08a8748ea605.jpg	品牌: 热人心 | 规格: 500g燕窝核桃五黑粉 | 适合场次: None	\N	\N	福建厦门	1	1	2	\N	f	f	\N	热人心	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	福利品	\N	\N	500g燕窝核桃五黑粉	2026-06-25 05:02:12.541	2026-06-25 05:02:12.541	\N
31	1	6	热人心红参阿胶九红粉	热人心 直播特惠福利商品	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363732547-322a0dab-9763-4b96-a957-1c2d1a693e21.jpg	品牌: 热人心 | 规格: 500g热人心红参阿胶九红粉 | 适合场次: None	\N	\N	广西南宁	1	1	2	\N	f	f	\N	热人心	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	福利品	\N	\N	500g热人心红参阿胶九红粉	2026-06-25 05:02:12.561	2026-06-25 05:02:12.561	\N
32	1	7	热人心老姜红糖130g	热人心 直播特惠福利商品	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363732569-7c79a551-838c-4b34-a324-2f99a08f0d1c.jpg	品牌: 热人心 | 规格: 130g老姜红糖1盒 | 适合场次: None	\N	\N	四川成都	1	1	2	\N	f	f	\N	热人心	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	福利品	\N	\N	130g老姜红糖1盒	2026-06-25 05:02:12.58	2026-06-25 05:02:12.58	\N
33	1	7	热人心老姜黑糖块糖180g	热人心 直播特惠福利商品	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363732587-4c3d8d7b-4827-41c3-ba15-6c57f781c495.jpg	品牌: 热人心 | 规格: 180g老姜黑糖1袋 | 适合场次: None	\N	\N	四川成都	1	1	2	\N	f	f	\N	热人心	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	福利品	\N	\N	180g老姜黑糖1袋	2026-06-25 05:02:12.599	2026-06-25 05:02:12.599	\N
34	1	7	好日子  冻干柠檬片45g	好日子 直播特惠福利商品	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363732606-e5f6b69f-1ef2-4dfd-8da1-30d862c887cd.jpg	品牌: 好日子 | 规格: 45g冻干柠檬片1袋 | 适合场次: None	\N	\N	广西南宁	1	1	2	\N	f	f	\N	好日子	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	福利品	\N	\N	45g冻干柠檬片1袋	2026-06-25 05:02:12.619	2026-06-25 05:02:12.619	\N
35	1	7	好日子  冻干柠檬片45g	好日子 直播特惠福利商品	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363732626-16166a3d-547b-40d0-a6a2-a45403d96e55.jpg	品牌: 好日子 | 规格: 45g冻干柠檬片2袋 | 适合场次: None	\N	\N	福建厦门	1	1	2	\N	f	f	\N	好日子	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	福利品	\N	\N	45g冻干柠檬片2袋	2026-06-25 05:02:12.638	2026-06-25 05:02:12.638	\N
36	1	7	好日子  玉米须茶80g	好日子 直播特惠福利商品	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363732645-9225cb84-d2e7-4128-9277-cc545dc47426.jpg	品牌: 好日子 | 规格: 玉米须茶80g | 适合场次: None	\N	\N	黑龙江牡丹江	1	1	2	\N	f	f	\N	好日子	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	福利品	\N	\N	玉米须茶80g	2026-06-25 05:02:12.654	2026-06-25 05:02:12.654	\N
37	1	5	热人心  有机白砂糖300g	热人心 直播特惠福利商品	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363732661-67a4cf3f-48ef-4154-b62e-dbdd72d5edfd.jpg	品牌: 热人心 | 规格: 300g有机白砂糖*3罐 | 适合场次: None	\N	\N	云南昭通	1	1	2	\N	f	f	\N	热人心	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	副品	\N	\N	300g有机白砂糖*3罐	2026-06-25 05:02:12.669	2026-06-25 05:02:12.669	\N
38	1	6	茯苓糕500g	好日子 直播特惠福利商品	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363732677-f53893b6-ed7e-4297-b8d2-54b8bcfc058b.jpg	品牌: 好日子 | 规格: 500g茯苓糕/箱（约30-34个左右） | 适合场次: None	\N	\N	山东寿光	1	1	2	\N	f	f	\N	好日子	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	福利品	\N	\N	500g茯苓糕/箱（约30-34个左右）	2026-06-25 05:02:12.689	2026-06-25 05:02:12.689	\N
39	1	6	天麻面500g/包	好日子 直播特惠福利商品	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363732696-966c4e25-bcc9-4e0c-9dd8-1ff830daec40.jpg	品牌: 好日子 | 规格: 500g/包*2 | 适合场次: None	\N	\N	云南昭通	1	1	2	\N	f	f	\N	好日子	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	福利品	\N	\N	500g/包*2	2026-06-25 05:02:12.704	2026-06-25 05:02:12.704	\N
40	1	8	14-16头即食海参尝鲜装	岛上的 鲜美即食辽参	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363732710-1f66f50f-8643-43fa-9b8d-53f293c775f2.jpg	品牌: 岛上的 | 配料: 辽参、纯净水 | 售后: 购买须知\n野生海参自然生长，并非标品，每只大小不等，故一斤海参只数有可能会在±2只的范围内波动。\n请详细阅读背贴上的保存方式，并严格按照要求进行保存。\n关于退货\n商品发售后一律不支持快件拦截和更改地址，敬请见谅。\n商品发货后不支持7天无理由退换、不支持拒收，因此诸如个人未按要求储存，接收不及时等一系列非产品本身质量问题一律不给予退换。\n免责声明\n因收方接收不当而导致产品变质，商家不予赔偿(收方个人原因签收不及时导致快件滞留;签收后不及时打开包裹妥善处理;签收后超4个小时反馈异常;收方通知快递小哥放快递柜、 便利店、 家门口或者非本人签收;个人拒收;未按照要求储存等因素所致损失，商家不承担责任。)	\N	\N	四川成都	1	1	2	\N	f	t	\N	岛上的	鹿岛万帝	辽参、纯净水	-18°C冷冻储藏，12个月	\N	\N	\N	7-10天	新疆、西藏、青海、云南、海南、港澳台以及海外不发	购买须知\n野生海参自然生长，并非标品，每只大小不等，故一斤海参只数有可能会在±2只的范围内波动。\n请详细阅读背贴上的保存方式，并严格按照要求进行保存。\n关于退货\n商品发售后一律不支持快件拦截和更改地址，敬请见谅。\n商品发货后不支持7天无理由退换、不支持拒收，因此诸如个人未按要求储存，接收不及时等一系列非产品本身质量问题一律不给予退换。\n免责声明\n因收方接收不当而导致产品变质，商家不予赔偿(收方个人原因签收不及时导致快件滞留;签收后不及时打开包裹妥善处理;签收后超4个小时反馈异常;收方通知快递小哥放快递柜、 便利店、 家门口或者非本人签收;个人拒收;未按照要求储存等因素所致损失，商家不承担责任。)	顺丰快递      （包运费/包普票）	\N	\N	\N	\N	2026-06-25 05:02:12.721	2026-06-25 05:02:12.721	\N
41	1	8	8-10头即食海参尝鲜装	岛上的 鲜美即食辽参	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363732729-5cf495a6-900d-41cb-85a4-3b88755bf110.jpg	品牌: 岛上的 | 配料: 辽参、纯净水 | 售后: 购买须知\n野生海参自然生长，并非标品，每只大小不等，故一斤海参只数有可能会在±2只的范围内波动。\n请详细阅读背贴上的保存方式，并严格按照要求进行保存。\n关于退货\n商品发售后一律不支持快件拦截和更改地址，敬请见谅。\n商品发货后不支持7天无理由退换、不支持拒收，因此诸如个人未按要求储存，接收不及时等一系列非产品本身质量问题一律不给予退换。\n免责声明\n因收方接收不当而导致产品变质，商家不予赔偿(收方个人原因签收不及时导致快件滞留;签收后不及时打开包裹妥善处理;签收后超4个小时反馈异常;收方通知快递小哥放快递柜、 便利店、 家门口或者非本人签收;个人拒收;未按照要求储存等因素所致损失，商家不承担责任。)	\N	\N	广西南宁	1	1	2	\N	f	t	\N	岛上的	鹿岛万帝	辽参、纯净水	-18°C冷冻储藏，12个月	\N	\N	\N	7-10天	新疆、西藏、青海、云南、海南、港澳台以及海外不发	购买须知\n野生海参自然生长，并非标品，每只大小不等，故一斤海参只数有可能会在±2只的范围内波动。\n请详细阅读背贴上的保存方式，并严格按照要求进行保存。\n关于退货\n商品发售后一律不支持快件拦截和更改地址，敬请见谅。\n商品发货后不支持7天无理由退换、不支持拒收，因此诸如个人未按要求储存，接收不及时等一系列非产品本身质量问题一律不给予退换。\n免责声明\n因收方接收不当而导致产品变质，商家不予赔偿(收方个人原因签收不及时导致快件滞留;签收后不及时打开包裹妥善处理;签收后超4个小时反馈异常;收方通知快递小哥放快递柜、 便利店、 家门口或者非本人签收;个人拒收;未按照要求储存等因素所致损失，商家不承担责任。)	顺丰快递      （包运费/包普票）	\N	\N	\N	\N	2026-06-25 05:02:12.743	2026-06-25 05:02:12.743	\N
42	1	8	5-6头即食海参尝鲜装	岛上的 鲜美即食辽参	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363732750-50ef2fee-ea95-4e91-9b82-6d4aa458db79.jpg	品牌: 岛上的 | 配料: 辽参、纯净水 | 售后: 购买须知\n野生海参自然生长，并非标品，每只大小不等，故一斤海参只数有可能会在±2只的范围内波动。\n请详细阅读背贴上的保存方式，并严格按照要求进行保存。\n关于退货\n商品发售后一律不支持快件拦截和更改地址，敬请见谅。\n商品发货后不支持7天无理由退换、不支持拒收，因此诸如个人未按要求储存，接收不及时等一系列非产品本身质量问题一律不给予退换。\n免责声明\n因收方接收不当而导致产品变质，商家不予赔偿(收方个人原因签收不及时导致快件滞留;签收后不及时打开包裹妥善处理;签收后超4个小时反馈异常;收方通知快递小哥放快递柜、 便利店、 家门口或者非本人签收;个人拒收;未按照要求储存等因素所致损失，商家不承担责任。)	\N	\N	云南昭通	1	1	2	\N	f	t	\N	岛上的	鹿岛万帝	辽参、纯净水	-18°C冷冻储藏，12个月	\N	\N	\N	7-10天	新疆、西藏、青海、云南、海南、港澳台以及海外不发	购买须知\n野生海参自然生长，并非标品，每只大小不等，故一斤海参只数有可能会在±2只的范围内波动。\n请详细阅读背贴上的保存方式，并严格按照要求进行保存。\n关于退货\n商品发售后一律不支持快件拦截和更改地址，敬请见谅。\n商品发货后不支持7天无理由退换、不支持拒收，因此诸如个人未按要求储存，接收不及时等一系列非产品本身质量问题一律不给予退换。\n免责声明\n因收方接收不当而导致产品变质，商家不予赔偿(收方个人原因签收不及时导致快件滞留;签收后不及时打开包裹妥善处理;签收后超4个小时反馈异常;收方通知快递小哥放快递柜、 便利店、 家门口或者非本人签收;个人拒收;未按照要求储存等因素所致损失，商家不承担责任。)	顺丰快递      （包运费/包普票）	\N	\N	\N	\N	2026-06-25 05:02:12.761	2026-06-25 05:02:12.761	\N
43	1	8	淡干海参100g	岛上的 鲜美即食辽参	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363732768-144a9a11-ecc1-4731-a105-db14ee571788.jpg	品牌: 岛上的 | 配料: 辽参、食用盐 | 售后: 购买须知\n野生海参自然生长，并非标品，每只大小不等，故一斤海参只数有可能会在±2只的范围内波动。\n请详细阅读背贴上的保存方式，并严格按照要求进行保存。\n关于退货\n商品发售后一律不支持快件拦截和更改地址，敬请见谅。\n商品发货后不支持7天无理由退换、不支持拒收，因此诸如个人未按要求储存，接收不及时等一系列非产品本身质量问题一律不给予退换。\n免责声明\n因收方接收不当而导致产品变质，商家不予赔偿(收方个人原因签收不及时导致快件滞留;签收后不及时打开包裹妥善处理;签收后超4个小时反馈异常;收方通知快递小哥放快递柜、 便利店、 家门口或者非本人签收;个人拒收;未按照要求储存等因素所致损失，商家不承担责任。)	\N	\N	山东寿光	1	1	2	\N	f	t	\N	岛上的	鹿岛万帝	辽参、食用盐	阴凉、干燥处避光避湿储存，24个月	\N	\N	\N	7-10天	新疆、西藏、青海、云南、海南、港澳台以及海外不发（简易包装：内胆盒）	购买须知\n野生海参自然生长，并非标品，每只大小不等，故一斤海参只数有可能会在±2只的范围内波动。\n请详细阅读背贴上的保存方式，并严格按照要求进行保存。\n关于退货\n商品发售后一律不支持快件拦截和更改地址，敬请见谅。\n商品发货后不支持7天无理由退换、不支持拒收，因此诸如个人未按要求储存，接收不及时等一系列非产品本身质量问题一律不给予退换。\n免责声明\n因收方接收不当而导致产品变质，商家不予赔偿(收方个人原因签收不及时导致快件滞留;签收后不及时打开包裹妥善处理;签收后超4个小时反馈异常;收方通知快递小哥放快递柜、 便利店、 家门口或者非本人签收;个人拒收;未按照要求储存等因素所致损失，商家不承担责任。)	顺丰快递      （包运费/包普票）	\N	\N	\N	\N	2026-06-25 05:02:12.783	2026-06-25 05:02:12.783	\N
50	1	8	五黑海参羹	岛上的 鲜美即食辽参	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363732928-1bd0c95b-22d9-48fd-9218-7a1b0296d0f1.jpg	品牌: 岛上的 | 配料: 生活饮用水、黑豆、海参、银耳、黑芝麻、黑枣、蓝莓、黑果枸杞、桑椹、冰糖 | 售后: None	\N	\N	福建厦门	1	1	2	\N	f	t	\N	岛上的	鹿岛万帝	生活饮用水、黑豆、海参、银耳、黑芝麻、黑枣、蓝莓、黑果枸杞、桑椹、冰糖	常温条件下置于阴凉干燥处，避免日晒，9个月	\N	\N	\N	7-10天	新疆、西藏、青海、云南、海南、港澳台以及海外不发	\N	顺丰快递      （不包运费/包普票）	\N	\N	\N	\N	2026-06-25 05:02:12.937	2026-06-25 05:02:12.937	\N
44	1	8	淡干海参礼盒250g	岛上的 鲜美即食辽参	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363732790-feb5b022-d32a-48d6-a516-5189c28d4458.jpg	品牌: 岛上的 | 配料: 辽参、食用盐 | 售后: 购买须知\n野生海参自然生长，并非标品，每只大小不等，故一斤海参只数有可能会在±2只的范围内波动。\n请详细阅读背贴上的保存方式，并严格按照要求进行保存。\n关于退货\n商品发售后一律不支持快件拦截和更改地址，敬请见谅。\n商品发货后不支持7天无理由退换、不支持拒收，因此诸如个人未按要求储存，接收不及时等一系列非产品本身质量问题一律不给予退换。\n免责声明\n因收方接收不当而导致产品变质，商家不予赔偿(收方个人原因签收不及时导致快件滞留;签收后不及时打开包裹妥善处理;签收后超4个小时反馈异常;收方通知快递小哥放快递柜、 便利店、 家门口或者非本人签收;个人拒收;未按照要求储存等因素所致损失，商家不承担责任。)	\N	\N	四川成都	1	1	2	\N	f	t	\N	岛上的	鹿岛万帝	辽参、食用盐	阴凉、干燥处避光避湿储存，24个月	\N	\N	\N	7-10天	新疆、西藏、青海、云南、海南、港澳台以及海外不发（简易包装：内胆盒）	购买须知\n野生海参自然生长，并非标品，每只大小不等，故一斤海参只数有可能会在±2只的范围内波动。\n请详细阅读背贴上的保存方式，并严格按照要求进行保存。\n关于退货\n商品发售后一律不支持快件拦截和更改地址，敬请见谅。\n商品发货后不支持7天无理由退换、不支持拒收，因此诸如个人未按要求储存，接收不及时等一系列非产品本身质量问题一律不给予退换。\n免责声明\n因收方接收不当而导致产品变质，商家不予赔偿(收方个人原因签收不及时导致快件滞留;签收后不及时打开包裹妥善处理;签收后超4个小时反馈异常;收方通知快递小哥放快递柜、 便利店、 家门口或者非本人签收;个人拒收;未按照要求储存等因素所致损失，商家不承担责任。)	顺丰快递      （包运费/包普票）	\N	\N	\N	\N	2026-06-25 05:02:12.802	2026-06-25 05:02:12.802	\N
45	1	8	淡干海参礼盒500g	岛上的 鲜美即食辽参	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363732809-1e5321f2-0179-4dc0-ac1d-567ba2beb074.jpg	品牌: 岛上的 | 配料: 辽参、食用盐 | 售后: 购买须知\n野生海参自然生长，并非标品，每只大小不等，故一斤海参只数有可能会在±2只的范围内波动。\n请详细阅读背贴上的保存方式，并严格按照要求进行保存。\n关于退货\n商品发售后一律不支持快件拦截和更改地址，敬请见谅。\n商品发货后不支持7天无理由退换、不支持拒收，因此诸如个人未按要求储存，接收不及时等一系列非产品本身质量问题一律不给予退换。\n免责声明\n因收方接收不当而导致产品变质，商家不予赔偿(收方个人原因签收不及时导致快件滞留;签收后不及时打开包裹妥善处理;签收后超4个小时反馈异常;收方通知快递小哥放快递柜、 便利店、 家门口或者非本人签收;个人拒收;未按照要求储存等因素所致损失，商家不承担责任。)	\N	\N	福建厦门	1	1	2	\N	f	t	\N	岛上的	鹿岛万帝	辽参、食用盐	阴凉、干燥处避光避湿储存，24个月	\N	\N	\N	7-10天	新疆、西藏、青海、云南、海南、港澳台以及海外不发（简易包装：内胆盒）	购买须知\n野生海参自然生长，并非标品，每只大小不等，故一斤海参只数有可能会在±2只的范围内波动。\n请详细阅读背贴上的保存方式，并严格按照要求进行保存。\n关于退货\n商品发售后一律不支持快件拦截和更改地址，敬请见谅。\n商品发货后不支持7天无理由退换、不支持拒收，因此诸如个人未按要求储存，接收不及时等一系列非产品本身质量问题一律不给予退换。\n免责声明\n因收方接收不当而导致产品变质，商家不予赔偿(收方个人原因签收不及时导致快件滞留;签收后不及时打开包裹妥善处理;签收后超4个小时反馈异常;收方通知快递小哥放快递柜、 便利店、 家门口或者非本人签收;个人拒收;未按照要求储存等因素所致损失，商家不承担责任。)	顺丰快递      （包运费/包普票）	\N	\N	\N	\N	2026-06-25 05:02:12.821	2026-06-25 05:02:12.821	\N
46	1	8	10只速发海参礼盒	岛上的 鲜美即食辽参	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363732828-fb64d296-d98d-4f7c-b14c-9a1e2579803a.jpg	品牌: 岛上的 | 配料: 辽参、食用盐 | 售后: 购买须知\n野生海参自然生长，并非标品，每只大小不等，故一斤海参只数有可能会在±2只的范围内波动。\n请详细阅读背贴上的保存方式，并严格按照要求进行保存。\n关于退货\n商品发售后一律不支持快件拦截和更改地址，敬请见谅。\n商品发货后不支持7天无理由退换、不支持拒收，因此诸如个人未按要求储存，接收不及时等一系列非产品本身质量问题一律不给予退换。\n免责声明\n因收方接收不当而导致产品变质，商家不予赔偿(收方个人原因签收不及时导致快件滞留;签收后不及时打开包裹妥善处理;签收后超4个小时反馈异常;收方通知快递小哥放快递柜、 便利店、 家门口或者非本人签收;个人拒收;未按照要求储存等因素所致损失，商家不承担责任。)	\N	\N	四川成都	1	1	2	\N	f	t	\N	岛上的	鹿岛万帝	辽参、食用盐	阴凉、干燥处避光避湿储存，24个月	\N	\N	\N	7-10天	新疆、西藏、青海、云南、海南、港澳台以及海外不发	购买须知\n野生海参自然生长，并非标品，每只大小不等，故一斤海参只数有可能会在±2只的范围内波动。\n请详细阅读背贴上的保存方式，并严格按照要求进行保存。\n关于退货\n商品发售后一律不支持快件拦截和更改地址，敬请见谅。\n商品发货后不支持7天无理由退换、不支持拒收，因此诸如个人未按要求储存，接收不及时等一系列非产品本身质量问题一律不给予退换。\n免责声明\n因收方接收不当而导致产品变质，商家不予赔偿(收方个人原因签收不及时导致快件滞留;签收后不及时打开包裹妥善处理;签收后超4个小时反馈异常;收方通知快递小哥放快递柜、 便利店、 家门口或者非本人签收;个人拒收;未按照要求储存等因素所致损失，商家不承担责任。)	顺丰快递      （包运费/包普票）	\N	\N	\N	\N	2026-06-25 05:02:12.842	2026-06-25 05:02:12.842	\N
47	1	8	20只速发海参礼盒	岛上的 鲜美即食辽参	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363732849-afa21c9f-3181-4a17-94a7-a0b2999f4625.jpg	品牌: 岛上的 | 配料: 辽参、食用盐 | 售后: 购买须知\n野生海参自然生长，并非标品，每只大小不等，故一斤海参只数有可能会在±2只的范围内波动。\n请详细阅读背贴上的保存方式，并严格按照要求进行保存。\n关于退货\n商品发售后一律不支持快件拦截和更改地址，敬请见谅。\n商品发货后不支持7天无理由退换、不支持拒收，因此诸如个人未按要求储存，接收不及时等一系列非产品本身质量问题一律不给予退换。\n免责声明\n因收方接收不当而导致产品变质，商家不予赔偿(收方个人原因签收不及时导致快件滞留;签收后不及时打开包裹妥善处理;签收后超7个小时反馈异常;收方通知快递小哥放快递柜、 便利店、 家门口或者非本人签收;个人拒收;未按照要求储存等因素所致损失，商家不承担责任。)	\N	\N	黑龙江牡丹江	1	1	2	\N	f	t	\N	岛上的	鹿岛万帝	辽参、食用盐	阴凉、干燥处避光避湿储存，24个月	\N	\N	\N	7-10天	新疆、西藏、青海、云南、海南、港澳台以及海外不发	购买须知\n野生海参自然生长，并非标品，每只大小不等，故一斤海参只数有可能会在±2只的范围内波动。\n请详细阅读背贴上的保存方式，并严格按照要求进行保存。\n关于退货\n商品发售后一律不支持快件拦截和更改地址，敬请见谅。\n商品发货后不支持7天无理由退换、不支持拒收，因此诸如个人未按要求储存，接收不及时等一系列非产品本身质量问题一律不给予退换。\n免责声明\n因收方接收不当而导致产品变质，商家不予赔偿(收方个人原因签收不及时导致快件滞留;签收后不及时打开包裹妥善处理;签收后超7个小时反馈异常;收方通知快递小哥放快递柜、 便利店、 家门口或者非本人签收;个人拒收;未按照要求储存等因素所致损失，商家不承担责任。)	顺丰快递      （包运费/包普票）	\N	\N	\N	\N	2026-06-25 05:02:12.86	2026-06-25 05:02:12.86	\N
48	1	8	30只速发海参礼盒	岛上的 鲜美即食辽参	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363732887-1e2c6918-6449-4993-a75d-b29fb755ee3d.jpg	品牌: 岛上的 | 配料: 辽参、食用盐 | 售后: 购买须知\n野生海参自然生长，并非标品，每只大小不等，故一斤海参只数有可能会在±2只的范围内波动。\n请详细阅读背贴上的保存方式，并严格按照要求进行保存。\n关于退货\n商品发售后一律不支持快件拦截和更改地址，敬请见谅。\n商品发货后不支持7天无理由退换、不支持拒收，因此诸如个人未按要求储存，接收不及时等一系列非产品本身质量问题一律不给予退换。\n免责声明\n因收方接收不当而导致产品变质，商家不予赔偿(收方个人原因签收不及时导致快件滞留;签收后不及时打开包裹妥善处理;签收后超8个小时反馈异常;收方通知快递小哥放快递柜、 便利店、 家门口或者非本人签收;个人拒收;未按照要求储存等因素所致损失，商家不承担责任。)	\N	\N	广西南宁	1	1	2	\N	f	t	\N	岛上的	鹿岛万帝	辽参、食用盐	阴凉、干燥处避光避湿储存，24个月	\N	\N	\N	7-10天	新疆、西藏、青海、云南、海南、港澳台以及海外不发	购买须知\n野生海参自然生长，并非标品，每只大小不等，故一斤海参只数有可能会在±2只的范围内波动。\n请详细阅读背贴上的保存方式，并严格按照要求进行保存。\n关于退货\n商品发售后一律不支持快件拦截和更改地址，敬请见谅。\n商品发货后不支持7天无理由退换、不支持拒收，因此诸如个人未按要求储存，接收不及时等一系列非产品本身质量问题一律不给予退换。\n免责声明\n因收方接收不当而导致产品变质，商家不予赔偿(收方个人原因签收不及时导致快件滞留;签收后不及时打开包裹妥善处理;签收后超8个小时反馈异常;收方通知快递小哥放快递柜、 便利店、 家门口或者非本人签收;个人拒收;未按照要求储存等因素所致损失，商家不承担责任。)	顺丰快递      （包运费/包普票）	\N	\N	\N	\N	2026-06-25 05:02:12.903	2026-06-25 05:02:12.903	\N
49	1	8	陈皮红豆海参羹	岛上的 鲜美即食辽参	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363732910-f4fb49fb-9e15-4787-a86d-3adc7621404f.jpg	品牌: 岛上的 | 配料: 生活饮用水、红豆沙馅（红小豆、生活饮用水、冰\n糖）、海参、红小豆、银耳、冰糖、红枣、枸杞、陈皮 | 售后: None	\N	\N	山东寿光	1	1	2	\N	f	t	\N	岛上的	鹿岛万帝	生活饮用水、红豆沙馅（红小豆、生活饮用水、冰\n糖）、海参、红小豆、银耳、冰糖、红枣、枸杞、陈皮	常温条件下置于阴凉干燥处，避免日晒，9个月	\N	\N	\N	7-10天	新疆、西藏、青海、云南、海南、港澳台以及海外不发	\N	顺丰快递      （不包运费/包普票）	\N	\N	\N	\N	2026-06-25 05:02:12.919	2026-06-25 05:02:12.919	\N
51	1	8	燕窝海参羹	岛上的 鲜美即食辽参	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363732943-25cd0b20-f2ef-4724-8fcc-85ed058f3d19.jpg	品牌: 岛上的 | 配料: 生活饮用水、海参、银耳、红枣、燕窝、枸杞、百香果、冰糖 | 售后: None	\N	\N	山东寿光	1	1	2	\N	f	t	\N	岛上的	鹿岛万帝	生活饮用水、海参、银耳、红枣、燕窝、枸杞、百香果、冰糖	常温条件下置于阴凉干燥处，避免日晒，9个月	\N	\N	\N	7-10天	新疆、西藏、青海、云南、海南、港澳台以及海外不发	\N	顺丰快递      （不包运费/包普票）	\N	\N	\N	\N	2026-06-25 05:02:12.957	2026-06-25 05:02:12.957	\N
52	1	8	花胶海参羹	岛上的 鲜美即食辽参	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363732967-3469e9c6-3ef3-4722-bb04-af921a1e2a82.jpg	品牌: 岛上的 | 配料: 生活饮用水、海参、花胶（鱼胶）、银耳、红枣、枸杞、百香果、冰糖 | 售后: None	\N	\N	福建厦门	1	1	2	\N	f	t	\N	岛上的	鹿岛万帝	生活饮用水、海参、花胶（鱼胶）、银耳、红枣、枸杞、百香果、冰糖	常温条件下置于阴凉干燥处，避免日晒，9个月	\N	\N	\N	7-10天	新疆、西藏、青海、云南、海南、港澳台以及海外不发	\N	顺丰快递      （不包运费/包普票）	\N	\N	\N	\N	2026-06-25 05:02:12.975	2026-06-25 05:02:12.975	\N
53	1	8	银耳鲜炖海参	岛上的 鲜美即食辽参	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363732982-7712f444-a5dc-48f9-8283-8327dcd4b803.jpg	品牌: 岛上的 | 配料: 纯净水、银耳、海参、大枣、枸杞、冰糖 | 售后: None	\N	\N	云南昭通	1	1	2	\N	f	t	\N	岛上的	鹿岛万帝	纯净水、银耳、海参、大枣、枸杞、冰糖	常温条件下置于阴凉干燥处，避免日晒，180天	\N	\N	\N	7-10天	新疆、西藏、青海、云南、海南、港澳台以及海外不发	\N	顺丰快递      （不包运费/包普票）	\N	\N	\N	\N	2026-06-25 05:02:12.991	2026-06-25 05:02:12.991	\N
54	1	9	查干湖冬捕野生胖头鱼大礼包	查干湖特产 | 鲜活直发 坏单包退	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363732998-30c2b8e4-391b-4609-86a2-d26a4311a9a9.jpg	查干湖野生胖头鱼，冬捕直发，鲜美可口，礼赠亲友上佳选择！	\N	\N	山东寿光	1	1	2	\N	f	t	\N	查干臻品	查干湖渔业开发有限公司	野生胖头鱼、冰块保鲜	-18℃冷冻储藏，12个月	\N	\N	\N	1-3天发货	偏远地区（新疆、西藏等）及无冷链覆盖城市不发货	冷链商品，签收后有质量问题2小时内赔付	顺丰冷链直达	\N	\N	\N	\N	2026-06-25 05:02:13.318	2026-06-25 05:02:13.318	\N
55	11	10	14-16头即食海参尝鲜装	33g左右/只（14-16只） 1斤装	http://124.223.108.180:6004/farm-public/products/1782736671401_0_14-16头即食海参尝鲜装.jpg	\N	null	\N	辽宁大连	1	1	2	\N	f	f	\N	岛上的	鹿岛万帝	辽参、纯净水	-18°C冷冻储藏，12个月	\N	\N	\N	7-10天	新疆、西藏、青海、云南、海南、港澳台以及海外不发	购买须知 野生海参自然生长，并非标品，每只大小不等，故一斤海参只数有可能会在±2只的范围内波动。 请详细阅读背贴上的保存方式，并严格按照要求进行保存。 关于退货 商品发售后一律不支持快件拦截和更改地址，敬请见谅。 商品发货后不支持7天无理由退换、不支持拒收，因此诸如个人未按要求储存，接收不及时等一系列非产品本身质量问题一律不给予退换。 免责声明 因收方接收不当而导致产品变质，商家不予赔偿(收方个人原因签收不及时导致快件滞留;签收后不及时打开包裹妥善处理;签收后超4个小时反馈异常;收方通知快递小哥放快递柜、 便利店、 家门口或者非本人签收;个人拒收;未按照要求储存等因素所致损失，商家不承担责任。)	顺丰快递      （包运费/包普票）	\N	\N	\N	\N	2026-06-29 12:37:51.43	2026-06-29 12:37:51.43	\N
56	11	10	8-10头即食海参尝鲜装	55g左右/只（8-10只） 1斤装	http://124.223.108.180:6004/farm-public/products/1782736671439_1_8-10头即食海参尝鲜装.jpg	\N	null	\N	辽宁大连	1	1	2	\N	f	f	\N	岛上的	鹿岛万帝	辽参、纯净水	-18°C冷冻储藏，12个月	\N	\N	\N	7-10天	新疆、西藏、青海、云南、海南、港澳台以及海外不发	购买须知 野生海参自然生长，并非标品，每只大小不等，故一斤海参只数有可能会在±2只的范围内波动。 请详细阅读背贴上的保存方式，并严格按照要求进行保存。 关于退货 商品发售后一律不支持快件拦截和更改地址，敬请见谅。 商品发货后不支持7天无理由退换、不支持拒收，因此诸如个人未按要求储存，接收不及时等一系列非产品本身质量问题一律不给予退换。 免责声明 因收方接收不当而导致产品变质，商家不予赔偿(收方个人原因签收不及时导致快件滞留;签收后不及时打开包裹妥善处理;签收后超4个小时反馈异常;收方通知快递小哥放快递柜、 便利店、 家门口或者非本人签收;个人拒收;未按照要求储存等因素所致损失，商家不承担责任。)	顺丰快递      （包运费/包普票）	\N	\N	\N	\N	2026-06-29 12:37:51.444	2026-06-29 12:37:51.444	\N
57	11	10	5-6头即食海参尝鲜装	100g左右/只（5-6只） 1斤装	http://124.223.108.180:6004/farm-public/products/1782736671452_2_5-6头即食海参尝鲜装.jpg	\N	null	\N	辽宁大连	1	1	2	\N	f	f	\N	岛上的	鹿岛万帝	辽参、纯净水	-18°C冷冻储藏，12个月	\N	\N	\N	7-10天	新疆、西藏、青海、云南、海南、港澳台以及海外不发	购买须知 野生海参自然生长，并非标品，每只大小不等，故一斤海参只数有可能会在±2只的范围内波动。 请详细阅读背贴上的保存方式，并严格按照要求进行保存。 关于退货 商品发售后一律不支持快件拦截和更改地址，敬请见谅。 商品发货后不支持7天无理由退换、不支持拒收，因此诸如个人未按要求储存，接收不及时等一系列非产品本身质量问题一律不给予退换。 免责声明 因收方接收不当而导致产品变质，商家不予赔偿(收方个人原因签收不及时导致快件滞留;签收后不及时打开包裹妥善处理;签收后超4个小时反馈异常;收方通知快递小哥放快递柜、 便利店、 家门口或者非本人签收;个人拒收;未按照要求储存等因素所致损失，商家不承担责任。)	顺丰快递      （包运费/包普票）	\N	\N	\N	\N	2026-06-29 12:37:51.458	2026-06-29 12:37:51.458	\N
58	11	4	淡干海参100g	100g	http://124.223.108.180:6004/farm-public/products/1782736671465_3_淡干海参100g.jpg	\N	null	\N	辽宁大连	1	1	2	\N	f	f	\N	岛上的	鹿岛万帝	辽参、食用盐	阴凉、干燥处避光避湿储存，24个月	\N	\N	\N	7-10天	新疆、西藏、青海、云南、海南、港澳台以及海外不发（简易包装：内胆盒）	购买须知 野生海参自然生长，并非标品，每只大小不等，故一斤海参只数有可能会在±2只的范围内波动。 请详细阅读背贴上的保存方式，并严格按照要求进行保存。 关于退货 商品发售后一律不支持快件拦截和更改地址，敬请见谅。 商品发货后不支持7天无理由退换、不支持拒收，因此诸如个人未按要求储存，接收不及时等一系列非产品本身质量问题一律不给予退换。 免责声明 因收方接收不当而导致产品变质，商家不予赔偿(收方个人原因签收不及时导致快件滞留;签收后不及时打开包裹妥善处理;签收后超4个小时反馈异常;收方通知快递小哥放快递柜、 便利店、 家门口或者非本人签收;个人拒收;未按照要求储存等因素所致损失，商家不承担责任。)	顺丰快递      （包运费/包普票）	\N	\N	\N	\N	2026-06-29 12:37:51.469	2026-06-29 12:37:51.469	\N
59	11	4	淡干海参礼盒250g	250g	http://124.223.108.180:6004/farm-public/products/1782736671476_4_淡干海参礼盒250g.jpg	\N	null	\N	辽宁大连	1	1	2	\N	f	f	\N	岛上的	鹿岛万帝	辽参、食用盐	阴凉、干燥处避光避湿储存，24个月	\N	\N	\N	7-10天	新疆、西藏、青海、云南、海南、港澳台以及海外不发（简易包装：内胆盒）	购买须知 野生海参自然生长，并非标品，每只大小不等，故一斤海参只数有可能会在±2只的范围内波动。 请详细阅读背贴上的保存方式，并严格按照要求进行保存。 关于退货 商品发售后一律不支持快件拦截和更改地址，敬请见谅。 商品发货后不支持7天无理由退换、不支持拒收，因此诸如个人未按要求储存，接收不及时等一系列非产品本身质量问题一律不给予退换。 免责声明 因收方接收不当而导致产品变质，商家不予赔偿(收方个人原因签收不及时导致快件滞留;签收后不及时打开包裹妥善处理;签收后超4个小时反馈异常;收方通知快递小哥放快递柜、 便利店、 家门口或者非本人签收;个人拒收;未按照要求储存等因素所致损失，商家不承担责任。)	顺丰快递      （包运费/包普票）	\N	\N	\N	\N	2026-06-29 12:37:51.481	2026-06-29 12:37:51.481	\N
60	11	4	淡干海参礼盒500g	500g	http://124.223.108.180:6004/farm-public/products/1782736671490_5_淡干海参礼盒500g.jpg	\N	null	\N	辽宁大连	1	1	2	\N	f	f	\N	岛上的	鹿岛万帝	辽参、食用盐	阴凉、干燥处避光避湿储存，24个月	\N	\N	\N	7-10天	新疆、西藏、青海、云南、海南、港澳台以及海外不发（简易包装：内胆盒）	购买须知 野生海参自然生长，并非标品，每只大小不等，故一斤海参只数有可能会在±2只的范围内波动。 请详细阅读背贴上的保存方式，并严格按照要求进行保存。 关于退货 商品发售后一律不支持快件拦截和更改地址，敬请见谅。 商品发货后不支持7天无理由退换、不支持拒收，因此诸如个人未按要求储存，接收不及时等一系列非产品本身质量问题一律不给予退换。 免责声明 因收方接收不当而导致产品变质，商家不予赔偿(收方个人原因签收不及时导致快件滞留;签收后不及时打开包裹妥善处理;签收后超4个小时反馈异常;收方通知快递小哥放快递柜、 便利店、 家门口或者非本人签收;个人拒收;未按照要求储存等因素所致损失，商家不承担责任。)	顺丰快递      （包运费/包普票）	\N	\N	\N	\N	2026-06-29 12:37:51.496	2026-06-29 12:37:51.496	\N
61	11	4	10只速发海参礼盒	10只	http://124.223.108.180:6004/farm-public/products/1782736671502_6_10只速发海参礼盒.jpg	\N	null	\N	辽宁大连	1	1	2	\N	f	f	\N	岛上的	鹿岛万帝	辽参、食用盐	阴凉、干燥处避光避湿储存，24个月	\N	\N	\N	7-10天	新疆、西藏、青海、云南、海南、港澳台以及海外不发	购买须知 野生海参自然生长，并非标品，每只大小不等，故一斤海参只数有可能会在±2只的范围内波动。 请详细阅读背贴上的保存方式，并严格按照要求进行保存。 关于退货 商品发售后一律不支持快件拦截和更改地址，敬请见谅。 商品发货后不支持7天无理由退换、不支持拒收，因此诸如个人未按要求储存，接收不及时等一系列非产品本身质量问题一律不给予退换。 免责声明 因收方接收不当而导致产品变质，商家不予赔偿(收方个人原因签收不及时导致快件滞留;签收后不及时打开包裹妥善处理;签收后超4个小时反馈异常;收方通知快递小哥放快递柜、 便利店、 家门口或者非本人签收;个人拒收;未按照要求储存等因素所致损失，商家不承担责任。)	顺丰快递      （包运费/包普票）	\N	\N	\N	\N	2026-06-29 12:37:51.507	2026-06-29 12:37:51.507	\N
62	11	4	20只速发海参礼盒	20只	http://124.223.108.180:6004/farm-public/products/1782736671514_7_20只速发海参礼盒.jpg	\N	null	\N	辽宁大连	1	1	2	\N	f	f	\N	岛上的	鹿岛万帝	辽参、食用盐	阴凉、干燥处避光避湿储存，24个月	\N	\N	\N	7-10天	新疆、西藏、青海、云南、海南、港澳台以及海外不发	购买须知 野生海参自然生长，并非标品，每只大小不等，故一斤海参只数有可能会在±2只的范围内波动。 请详细阅读背贴上的保存方式，并严格按照要求进行保存。 关于退货 商品发售后一律不支持快件拦截和更改地址，敬请见谅。 商品发货后不支持7天无理由退换、不支持拒收，因此诸如个人未按要求储存，接收不及时等一系列非产品本身质量问题一律不给予退换。 免责声明 因收方接收不当而导致产品变质，商家不予赔偿(收方个人原因签收不及时导致快件滞留;签收后不及时打开包裹妥善处理;签收后超7个小时反馈异常;收方通知快递小哥放快递柜、 便利店、 家门口或者非本人签收;个人拒收;未按照要求储存等因素所致损失，商家不承担责任。)	顺丰快递      （包运费/包普票）	\N	\N	\N	\N	2026-06-29 12:37:51.519	2026-06-29 12:37:51.519	\N
63	11	4	30只速发海参礼盒	30只	http://124.223.108.180:6004/farm-public/products/1782736671527_8_30只速发海参礼盒.jpg	\N	null	\N	辽宁大连	1	1	2	\N	f	f	\N	岛上的	鹿岛万帝	辽参、食用盐	阴凉、干燥处避光避湿储存，24个月	\N	\N	\N	7-10天	新疆、西藏、青海、云南、海南、港澳台以及海外不发	购买须知 野生海参自然生长，并非标品，每只大小不等，故一斤海参只数有可能会在±2只的范围内波动。 请详细阅读背贴上的保存方式，并严格按照要求进行保存。 关于退货 商品发售后一律不支持快件拦截和更改地址，敬请见谅。 商品发货后不支持7天无理由退换、不支持拒收，因此诸如个人未按要求储存，接收不及时等一系列非产品本身质量问题一律不给予退换。 免责声明 因收方接收不当而导致产品变质，商家不予赔偿(收方个人原因签收不及时导致快件滞留;签收后不及时打开包裹妥善处理;签收后超8个小时反馈异常;收方通知快递小哥放快递柜、 便利店、 家门口或者非本人签收;个人拒收;未按照要求储存等因素所致损失，商家不承担责任。)	顺丰快递      （包运费/包普票）	\N	\N	\N	\N	2026-06-29 12:37:51.532	2026-06-29 12:37:51.532	\N
64	11	4	陈皮红豆海参羹	1548克/（内含6碗）	http://124.223.108.180:6004/farm-public/products/1782736671538_9_陈皮红豆海参羹.jpg	\N	null	\N	辽宁大连	1	1	2	\N	f	f	\N	岛上的	鹿岛万帝	生活饮用水、红豆沙馅（红小豆、生活饮用水、冰 糖）、海参、红小豆、银耳、冰糖、红枣、枸杞、陈皮	常温条件下置于阴凉干燥处，避免日晒，9个月	\N	\N	\N	7-10天	新疆、西藏、青海、云南、海南、港澳台以及海外不发	\N	顺丰快递      （不包运费/包普票）	\N	\N	\N	\N	2026-06-29 12:37:51.544	2026-06-29 12:37:51.544	\N
65	11	4	五黑海参羹	1488克/（内含6碗）	http://124.223.108.180:6004/farm-public/products/1782736671549_10_五黑海参羹.jpg	\N	null	\N	辽宁大连	1	1	2	\N	f	f	\N	岛上的	鹿岛万帝	生活饮用水、黑豆、海参、银耳、黑芝麻、黑枣、蓝莓、黑果枸杞、桑椹、冰糖	常温条件下置于阴凉干燥处，避免日晒，9个月	\N	\N	\N	7-10天	新疆、西藏、青海、云南、海南、港澳台以及海外不发	\N	顺丰快递      （不包运费/包普票）	\N	\N	\N	\N	2026-06-29 12:37:51.554	2026-06-29 12:37:51.554	\N
66	11	4	燕窝海参羹	1488克/（内含6碗）	http://124.223.108.180:6004/farm-public/products/1782736671559_11_燕窝海参羹.jpg	\N	null	\N	辽宁大连	1	1	2	\N	f	f	\N	岛上的	鹿岛万帝	生活饮用水、海参、银耳、红枣、燕窝、枸杞、百香果、冰糖	常温条件下置于阴凉干燥处，避免日晒，9个月	\N	\N	\N	7-10天	新疆、西藏、青海、云南、海南、港澳台以及海外不发	\N	顺丰快递      （不包运费/包普票）	\N	\N	\N	\N	2026-06-29 12:37:51.564	2026-06-29 12:37:51.564	\N
67	11	4	花胶海参羹	1488克/（内含6碗）	http://124.223.108.180:6004/farm-public/products/1782736671569_12_花胶海参羹.jpg	\N	null	\N	辽宁大连	1	1	2	\N	f	f	\N	岛上的	鹿岛万帝	生活饮用水、海参、花胶（鱼胶）、银耳、红枣、枸杞、百香果、冰糖	常温条件下置于阴凉干燥处，避免日晒，9个月	\N	\N	\N	7-10天	新疆、西藏、青海、云南、海南、港澳台以及海外不发	\N	顺丰快递      （不包运费/包普票）	\N	\N	\N	\N	2026-06-29 12:37:51.574	2026-06-29 12:37:51.574	\N
1	1	2	吸油纸100张	厨房日用精选 | 20张/包*5包	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363731990-9e3e7d67-c8a7-447d-95d9-d5881ce30d23.jpg	尺寸: 直径20cm | 材质: 原生木浆纸（食品级） | 保质期: 5年 | 生产日期: 2026年1月后	\N	\N	福建厦门	1	1	2	\N	f	f	{"needed": 3, "enabled": true, "expireHours": 24, "discountRate": 0.7}	家用精选	\N	\N	5年	2026年1月后	原生木浆纸（食品级）	直径20cm	\N	\N	\N	\N	福利品	\N	\N	\N	2026-06-25 05:02:12.007	2026-06-25 05:02:12.007	\N
2	1	2	烤肉纸100张	厨房日用精选 | 20张/包*5包	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363732022-c061dbdf-d889-4a20-868f-3a85c7a03126.jpg	尺寸: 25*30cm | 材质: 双面硅油纸（食品级） | 保质期: 5年 | 生产日期: 2026年1月后	\N	\N	广西南宁	1	1	2	\N	f	f	{"needed": 3, "enabled": true, "expireHours": 24, "discountRate": 0.7}	家用精选	\N	\N	5年	2026年1月后	双面硅油纸（食品级）	25*30cm	\N	\N	\N	\N	福利品	\N	\N	\N	2026-06-25 05:02:12.034	2026-06-25 05:02:12.034	\N
3	1	2	蒸笼纸100张	厨房日用精选 | 20张/包*5包	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363732041-b10c6a16-7ff0-48f5-8b5f-fc9f7fa0005b.jpg	尺寸: 直径28cm | 材质: 双面硅油纸（食品级） | 保质期: 5年 | 生产日期: 2026年1月后	\N	\N	广西南宁	1	1	2	\N	f	f	{"needed": 3, "enabled": true, "expireHours": 24, "discountRate": 0.7}	家用精选	\N	\N	5年	2026年1月后	双面硅油纸（食品级）	直径28cm	\N	\N	\N	\N	福利品	\N	\N	\N	2026-06-25 05:02:12.054	2026-06-25 05:02:12.054	\N
68	11	4	银耳鲜炖海参	800克/（内含8瓶）	http://124.223.108.180:6004/farm-public/products/1782736671580_13_银耳鲜炖海参.jpg	\N	null	\N	辽宁大连	1	1	2	\N	f	f	\N	岛上的	鹿岛万帝	纯净水、银耳、海参、大枣、枸杞、冰糖	常温条件下置于阴凉干燥处，避免日晒，180天	\N	\N	\N	7-10天	新疆、西藏、青海、云南、海南、港澳台以及海外不发	\N	顺丰快递      （不包运费/包普票）	\N	\N	\N	\N	2026-06-29 12:37:51.584	2026-07-03 09:06:47.112	\N
\.


--
-- Data for Name: product_image; Type: TABLE DATA; Schema: public; Owner: farm
--

COPY public.product_image (id, product_id, image_url, sort_order, created_at) FROM stdin;
1	1	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363731998-0894db1f-cd2a-4ed4-ae91-91b3b54c8851.jpg	1	2026-06-25 05:02:12.017
2	2	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363732030-d24e8540-b835-4b99-a869-78c26f63f09e.jpg	1	2026-06-25 05:02:12.038
3	3	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363732047-6232346d-e1a6-4ed1-b62b-72ca10707e7e.jpg	1	2026-06-25 05:02:12.058
4	4	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363732067-f13a6743-a573-4635-89d8-9cead87e1c1d.jpg	1	2026-06-25 05:02:12.08
5	5	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363732090-c6aec2c6-0eef-42fd-81ca-d0b57f9b8a93.jpg	1	2026-06-25 05:02:12.099
6	6	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363732107-5dc586a2-572f-427d-969e-8129f0293780.jpg	1	2026-06-25 05:02:12.118
7	7	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363732125-684aeb65-f651-4aa5-b248-370ee5c03bf6.jpg	1	2026-06-25 05:02:12.134
8	8	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363732145-36446b08-e0f1-4c2a-ba35-f8b545a96ff6.jpg	1	2026-06-25 05:02:12.154
9	9	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363732161-1f7aaf01-2a6c-4714-aa93-a36e6898b22e.jpg	1	2026-06-25 05:02:12.169
10	10	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363732179-d2d80b6a-6682-49b1-b8f4-5aba94033d36.jpg	1	2026-06-25 05:02:12.187
11	11	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363732196-e412e16e-9c65-4a33-bd95-3c31713108bd.jpg	1	2026-06-25 05:02:12.206
12	12	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363732217-3e7071e5-f1dc-409b-9774-99ce9ff7e964.jpg	1	2026-06-25 05:02:12.226
13	13	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363732235-1b9f7213-e2b3-4791-a0e0-5ef4c14fa100.jpg	1	2026-06-25 05:02:12.243
14	14	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363732253-d167a90a-a877-436b-8226-dd6679155176.jpg	1	2026-06-25 05:02:12.261
15	15	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363732273-16c52aaa-8163-43e1-b186-8e4bdd0f5bbe.jpg	1	2026-06-25 05:02:12.282
16	16	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363732289-6932cb30-fb20-4935-b488-a4bbc5d7072a.jpg	1	2026-06-25 05:02:12.296
17	17	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363732306-28c1f856-8aa1-4528-ab19-634cf6507948.jpg	1	2026-06-25 05:02:12.315
18	18	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363732324-272f076b-6b31-434e-8198-e89e7388ff33.jpg	1	2026-06-25 05:02:12.333
19	19	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363732340-a63aab7b-0c77-4c7e-9295-525f3f1a0b00.jpg	1	2026-06-25 05:02:12.348
20	20	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363732354-dc6c1e4f-3595-4360-86c0-e7f8b16804f5.jpg	1	2026-06-25 05:02:12.362
21	21	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363732370-7347099a-3aac-42e8-b985-0518578da495.jpg	1	2026-06-25 05:02:12.381
22	22	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363732392-0887602d-7e49-4a20-a477-8c93ebd947e8.jpg	1	2026-06-25 05:02:12.401
23	23	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363732409-85c23a8f-fe5e-44be-974f-7d1a60a66fad.jpg	1	2026-06-25 05:02:12.422
24	24	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363732430-ec5f578a-a715-43e3-9c81-5e0cdb4bb0f7.jpg	1	2026-06-25 05:02:12.44
25	25	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363732447-ac7cb897-3742-418d-a20f-adad0885dae9.jpg	1	2026-06-25 05:02:12.454
26	26	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363732462-6cf12be3-f056-42be-adb0-291fd8457a6c.jpg	1	2026-06-25 05:02:12.471
27	27	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363732478-1a2751ad-3fc0-4c71-9eb0-9f51e600b95c.jpg	1	2026-06-25 05:02:12.49
28	28	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363732497-124ff195-3a06-4369-a1bc-ec71a72b0730.jpg	1	2026-06-25 05:02:12.507
29	29	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363732516-bbf1d15b-3ae2-4783-8742-5eb3337fc3ef.jpg	1	2026-06-25 05:02:12.526
30	30	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363732535-92bf7084-ccb6-49fe-bc0d-5dea7c9d89a9.jpg	1	2026-06-25 05:02:12.544
31	31	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363732554-85922c0c-2435-4f06-a4ec-afe942f7b079.jpg	1	2026-06-25 05:02:12.565
32	32	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363732575-0f1d69d4-e1e0-451a-bda6-bb4c56c526f2.jpg	1	2026-06-25 05:02:12.584
33	33	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363732593-498082b2-d926-4253-9711-c506553135e0.jpg	1	2026-06-25 05:02:12.603
34	34	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363732614-6f2275d7-9b8d-4d8f-a02b-63bec23cd415.jpg	1	2026-06-25 05:02:12.623
35	35	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363732632-af7b9510-4dde-4055-8c1d-50256670df62.jpg	1	2026-06-25 05:02:12.642
36	36	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363732649-3bc52795-02c1-41c6-9ac7-7a30bbf849aa.jpg	1	2026-06-25 05:02:12.658
37	37	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363732666-331932e0-72c7-4802-a934-35da73843e96.jpg	1	2026-06-25 05:02:12.674
38	38	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363732683-d8d2d2c2-cbce-44b0-98f0-b82e4c119d49.jpg	1	2026-06-25 05:02:12.693
39	39	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363732700-b6fc7967-a85b-4553-9d30-89f262500f26.jpg	1	2026-06-25 05:02:12.707
40	40	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363732715-c1162425-bb75-43ab-8e26-fa62d97cccb5.jpg	1	2026-06-25 05:02:12.726
41	41	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363732738-52fbaedf-036f-4b3e-b6e4-9cfda892d8cf.jpg	1	2026-06-25 05:02:12.747
42	42	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363732756-9a9f0dc6-a93e-4516-a22b-b028362f8953.jpg	1	2026-06-25 05:02:12.765
43	43	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363732776-62e32944-8362-44d9-ad63-c2566f9d8c58.jpg	1	2026-06-25 05:02:12.787
44	44	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363732797-7134cc55-2bad-4673-a0e2-78da97463df4.jpg	1	2026-06-25 05:02:12.806
45	45	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363732815-ee578a2d-effc-4f9c-b8a5-0b1bc3497094.jpg	1	2026-06-25 05:02:12.825
46	46	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363732836-e68fe354-74d8-4042-a04b-173ba42124f9.jpg	1	2026-06-25 05:02:12.846
47	47	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363732855-845dff00-1ef4-4296-9664-64b949e06e2d.jpg	1	2026-06-25 05:02:12.87
48	48	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363732898-02415849-b18f-40fc-8179-f280e47d0707.jpg	1	2026-06-25 05:02:12.907
49	49	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363732914-7a066c1b-0dd8-43b1-8f1b-3db2751270d4.jpg	1	2026-06-25 05:02:12.925
50	50	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363732932-8e1b0457-e932-4347-8a7a-7b14e557f57f.jpg	1	2026-06-25 05:02:12.941
51	51	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363732949-9fcc4d79-c171-49b0-9f0a-6ebf6bde70f1.jpg	1	2026-06-25 05:02:12.964
52	52	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363732971-21973c86-20c7-45aa-98e0-ec5a4af0cecd.jpg	1	2026-06-25 05:02:12.979
53	53	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363732986-18f1e9e9-0fde-429a-9e4f-a74edc01e557.jpg	1	2026-06-25 05:02:12.995
54	54	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363733007-d771f3c7-646d-4484-8dd0-3284fd0b4d4c.jpg	1	2026-06-25 05:02:13.324
55	54	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363733014-bbac7d6c-4dd5-494b-b250-dc0fba189592.jpg	2	2026-06-25 05:02:13.324
56	54	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363733022-0b950e23-db55-49ef-9d93-8796ce79436b.jpg	3	2026-06-25 05:02:13.324
57	55	http://124.223.108.180:6004/farm-public/products/1782736671401_0_14-16头即食海参尝鲜装.jpg	0	2026-06-29 12:37:51.437
58	56	http://124.223.108.180:6004/farm-public/products/1782736671439_1_8-10头即食海参尝鲜装.jpg	0	2026-06-29 12:37:51.451
59	57	http://124.223.108.180:6004/farm-public/products/1782736671452_2_5-6头即食海参尝鲜装.jpg	0	2026-06-29 12:37:51.463
60	58	http://124.223.108.180:6004/farm-public/products/1782736671465_3_淡干海参100g.jpg	0	2026-06-29 12:37:51.475
61	59	http://124.223.108.180:6004/farm-public/products/1782736671476_4_淡干海参礼盒250g.jpg	0	2026-06-29 12:37:51.489
62	60	http://124.223.108.180:6004/farm-public/products/1782736671490_5_淡干海参礼盒500g.jpg	0	2026-06-29 12:37:51.501
63	61	http://124.223.108.180:6004/farm-public/products/1782736671502_6_10只速发海参礼盒.jpg	0	2026-06-29 12:37:51.513
64	62	http://124.223.108.180:6004/farm-public/products/1782736671514_7_20只速发海参礼盒.jpg	0	2026-06-29 12:37:51.525
65	63	http://124.223.108.180:6004/farm-public/products/1782736671527_8_30只速发海参礼盒.jpg	0	2026-06-29 12:37:51.537
66	64	http://124.223.108.180:6004/farm-public/products/1782736671538_9_陈皮红豆海参羹.jpg	0	2026-06-29 12:37:51.548
67	65	http://124.223.108.180:6004/farm-public/products/1782736671549_10_五黑海参羹.jpg	0	2026-06-29 12:37:51.558
68	66	http://124.223.108.180:6004/farm-public/products/1782736671559_11_燕窝海参羹.jpg	0	2026-06-29 12:37:51.568
69	67	http://124.223.108.180:6004/farm-public/products/1782736671569_12_花胶海参羹.jpg	0	2026-06-29 12:37:51.578
70	68	http://124.223.108.180:6004/farm-public/products/1782736671580_13_银耳鲜炖海参.jpg	0	2026-06-29 12:37:51.588
\.


--
-- Data for Name: product_review; Type: TABLE DATA; Schema: public; Owner: farm
--

COPY public.product_review (id, order_id, order_no, order_item_id, user_id, merchant_id, product_id, sku_id, rating, content, images, reply_content, replied_at, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: product_sku; Type: TABLE DATA; Schema: public; Owner: farm
--

COPY public.product_sku (id, product_id, sku_name, sku_code, image_url, spec_json, price, original_price, stock, locked_stock, weight, status, offline_price, safety_stock, promotion_price, promotion_start_at, promotion_end_at, created_at, updated_at, deleted_at) FROM stdin;
2	2	20张/包*5包	HW-1813	\N	\N	9.90	19.90	2000	0	\N	1	\N	2000	\N	\N	\N	2026-06-25 05:02:12.036	2026-06-25 05:02:12.036	\N
4	4	100片/盒	HW-0267	\N	\N	9.90	19.90	2000	0	\N	1	\N	2000	\N	\N	\N	2026-06-25 05:02:12.078	2026-06-25 05:02:12.078	\N
5	5	20个/盒*5盒	HW-0270	\N	\N	9.90	19.90	2000	0	\N	1	\N	2000	\N	\N	\N	2026-06-25 05:02:12.097	2026-06-25 05:02:12.097	\N
6	6	50只/包*4包	HW-8313	\N	\N	9.90	19.90	2000	0	\N	1	\N	2000	\N	\N	\N	2026-06-25 05:02:12.115	2026-06-25 05:02:12.115	\N
7	7	40只/桶*4桶	HW-8317	\N	\N	9.90	19.90	2000	0	\N	1	\N	2000	\N	\N	\N	2026-06-25 05:02:12.132	2026-06-25 05:02:12.132	\N
8	8	50只/包*4包	HW-8043	\N	\N	9.90	19.90	2000	0	\N	1	\N	2000	\N	\N	\N	2026-06-25 05:02:12.152	2026-06-25 05:02:12.152	\N
10	10	200只/包*2包	HW-8079	\N	\N	9.90	19.90	2000	0	\N	1	\N	2000	\N	\N	\N	2026-06-25 05:02:12.185	2026-06-25 05:02:12.185	\N
11	11	50只/包*2包	HW-8044	\N	\N	9.90	19.90	2000	0	\N	1	\N	2000	\N	\N	\N	2026-06-25 05:02:12.204	2026-06-25 05:02:12.204	\N
12	12	10只/包*2包\n（红色/白色）	HW-8080	\N	\N	9.90	19.90	2000	0	\N	1	\N	2000	\N	\N	\N	2026-06-25 05:02:12.224	2026-06-25 05:02:12.224	\N
13	13	50个/包*4包	HW-8063	\N	\N	9.90	19.90	2000	0	\N	1	\N	2000	\N	\N	\N	2026-06-25 05:02:12.241	2026-06-25 05:02:12.241	\N
14	14	100只/包*3包\n（均码）	HW-8055	\N	\N	9.90	19.90	2000	0	\N	1	\N	2000	\N	\N	\N	2026-06-25 05:02:12.259	2026-06-25 05:02:12.259	\N
15	15	50张/包*3包	HW-2124	\N	\N	9.90	19.90	2000	0	\N	1	\N	2000	\N	\N	\N	2026-06-25 05:02:12.279	2026-06-25 05:02:12.279	\N
16	16	100只/卷*2卷	HW-8010	\N	\N	9.90	19.90	2000	0	\N	1	\N	2000	\N	\N	\N	2026-06-25 05:02:12.294	2026-06-25 05:02:12.294	\N
17	17	100只/包*4包	HW-8078	\N	\N	9.90	19.90	2000	0	\N	1	\N	2000	\N	\N	\N	2026-06-25 05:02:12.313	2026-06-25 05:02:12.313	\N
18	18	6只/盒*4盒	HW-1165	\N	\N	9.90	19.90	2000	0	\N	1	\N	2000	\N	\N	\N	2026-06-25 05:02:12.331	2026-06-25 05:02:12.331	\N
19	19	80米/卷*2卷	HW-8073	\N	\N	9.90	19.90	2000	0	\N	1	\N	2000	\N	\N	\N	2026-06-25 05:02:12.346	2026-06-25 05:02:12.346	\N
20	20	1盒\n（内含：碗10只+杯10只+勺10只+筷10双+桌布1张+收纳袋2只）	HW-8050	\N	\N	9.90	19.90	2000	0	\N	1	\N	2000	\N	\N	\N	2026-06-25 05:02:12.36	2026-06-25 05:02:12.36	\N
21	21	1包\n（内含：碗10只+杯10只+筷10双+牙签10支+碟10个+勺10个+台布1张	HW-8012	\N	\N	9.90	19.90	2000	0	\N	1	\N	2000	\N	\N	\N	2026-06-25 05:02:12.379	2026-06-25 05:02:12.379	\N
22	22	1包\n（内含：10碗 10杯 10筷子\n 10牙签  ） 	HW-8011	\N	\N	9.90	19.90	2000	0	\N	1	\N	2000	\N	\N	\N	2026-06-25 05:02:12.399	2026-06-25 05:02:12.399	\N
23	23	1包\n（11件套：10卷粘纸+1把手柄）	HW-8821	\N	\N	9.90	19.90	2000	0	\N	1	\N	2000	\N	\N	\N	2026-06-25 05:02:12.419	2026-06-25 05:02:12.419	\N
24	24	25只/盒*2盒	HW-茂林0960	\N	\N	9.90	19.90	2000	0	\N	1	\N	2000	\N	\N	\N	2026-06-25 05:02:12.437	2026-06-25 05:02:12.437	\N
25	25	100只/桶*2桶	HW-8318	\N	\N	9.90	19.90	2000	0	\N	1	\N	2000	\N	\N	\N	2026-06-25 05:02:12.452	2026-06-25 05:02:12.452	\N
27	27	500g黄冰糖1袋	LY-3	\N	\N	19.90	29.90	1000	0	\N	1	\N	\N	\N	\N	\N	2026-06-25 05:02:12.488	2026-06-25 05:02:12.488	\N
28	28	100g玉米淀粉8袋	LY-4	\N	\N	19.90	29.90	1000	0	\N	1	\N	\N	\N	\N	\N	2026-06-25 05:02:12.505	2026-06-25 05:02:12.505	\N
29	29	500g燕窝银耳豆浆粉1罐	LY-5	\N	\N	19.90	29.90	1000	0	\N	1	\N	\N	\N	\N	\N	2026-06-25 05:02:12.524	2026-06-25 05:02:12.524	\N
30	30	500g燕窝核桃五黑粉	LY-6	\N	\N	19.90	29.90	1000	0	\N	1	\N	\N	\N	\N	\N	2026-06-25 05:02:12.543	2026-06-25 05:02:12.543	\N
31	31	500g热人心红参阿胶九红粉	LY-7	\N	\N	19.90	29.90	1000	0	\N	1	\N	\N	\N	\N	\N	2026-06-25 05:02:12.563	2026-06-25 05:02:12.563	\N
32	32	130g老姜红糖1盒	LY-8	\N	\N	19.90	29.90	1000	0	\N	1	\N	\N	\N	\N	\N	2026-06-25 05:02:12.582	2026-06-25 05:02:12.582	\N
33	33	180g老姜黑糖1袋	LY-9	\N	\N	19.90	29.90	1000	0	\N	1	\N	\N	\N	\N	\N	2026-06-25 05:02:12.601	2026-06-25 05:02:12.601	\N
34	34	45g冻干柠檬片1袋	LY-10	\N	\N	19.90	29.90	1000	0	\N	1	\N	\N	\N	\N	\N	2026-06-25 05:02:12.621	2026-06-25 05:02:12.621	\N
35	35	45g冻干柠檬片2袋	LY-11	\N	\N	19.90	29.90	1000	0	\N	1	\N	\N	\N	\N	\N	2026-06-25 05:02:12.64	2026-06-25 05:02:12.64	\N
36	36	玉米须茶80g	LY-12	\N	\N	19.90	29.90	1000	0	\N	1	\N	\N	\N	\N	\N	2026-06-25 05:02:12.656	2026-06-25 05:02:12.656	\N
37	37	300g有机白砂糖*3罐	LY-13	\N	\N	19.90	29.90	1000	0	\N	1	\N	\N	\N	\N	\N	2026-06-25 05:02:12.672	2026-06-25 05:02:12.672	\N
38	38	500g茯苓糕/箱（约30-34个左右）	LY-14	\N	\N	19.90	29.90	1000	0	\N	1	\N	\N	\N	\N	\N	2026-06-25 05:02:12.691	2026-06-25 05:02:12.691	\N
40	40	33g左右/只（14-16只）\n1斤装	LD-2	\N	\N	499.00	598.80	2000	0	\N	1	499.00	\N	\N	\N	\N	2026-06-25 05:02:12.724	2026-06-25 05:02:12.724	\N
41	41	55g左右/只（8-10只）\n1斤装	LD-3	\N	\N	629.00	754.80	2000	0	\N	1	629.00	\N	\N	\N	\N	2026-06-25 05:02:12.745	2026-06-25 05:02:12.745	\N
42	42	100g左右/只（5-6只）\n1斤装	LD-4	\N	\N	759.00	910.80	1000	0	\N	1	759.00	\N	\N	\N	\N	2026-06-25 05:02:12.763	2026-06-25 05:02:12.763	\N
43	43	100g	LD-5	\N	\N	5888.00	7065.60	1000	0	\N	1	5888.00	\N	\N	\N	\N	2026-06-25 05:02:12.785	2026-06-25 05:02:12.785	\N
44	44	250g	LD-6	\N	\N	15999.00	19198.80	1000	0	\N	1	15999.00	\N	\N	\N	\N	2026-06-25 05:02:12.804	2026-06-25 05:02:12.804	\N
45	45	500g	LD-7	\N	\N	28888.00	34665.60	1000	0	\N	1	28888.00	\N	\N	\N	\N	2026-06-25 05:02:12.823	2026-06-25 05:02:12.823	\N
46	46	10只	LD-8	\N	\N	2598.00	3117.60	1000	0	\N	1	2598.00	\N	\N	\N	\N	2026-06-25 05:02:12.844	2026-06-25 05:02:12.844	\N
47	47	20只	LD-9	\N	\N	5188.00	6225.60	1000	0	\N	1	5188.00	\N	\N	\N	\N	2026-06-25 05:02:12.866	2026-06-25 05:02:12.866	\N
48	48	30只	LD-10	\N	\N	7888.00	9465.60	1000	0	\N	1	7888.00	\N	\N	\N	\N	2026-06-25 05:02:12.905	2026-06-25 05:02:12.905	\N
49	49	1548克/（内含6碗）	LD-11	\N	\N	359.00	430.80	1000	0	\N	1	359.00	\N	\N	\N	\N	2026-06-25 05:02:12.923	2026-06-25 05:02:12.923	\N
51	51	1488克/（内含6碗）	LD-13	\N	\N	359.00	430.80	1000	0	\N	1	359.00	\N	\N	\N	\N	2026-06-25 05:02:12.962	2026-06-25 05:02:12.962	\N
52	52	1488克/（内含6碗）	LD-14	\N	\N	359.00	430.80	1000	0	\N	1	359.00	\N	\N	\N	\N	2026-06-25 05:02:12.977	2026-06-25 05:02:12.977	\N
57	57	100g左右/只（5-6只） 1斤装	SKU00031782736671460	\N	\N	759.00	759.00	999	1	\N	1	\N	\N	\N	\N	\N	2026-06-29 12:37:51.461	2026-06-30 10:57:57.03	\N
9	9	10个/包*5包	HW-1172	\N	\N	9.90	19.90	2000	0	\N	1	\N	2000	\N	\N	\N	2026-06-25 05:02:12.167	2026-06-25 09:32:31.391	\N
1	1	20张/包*5包	HW-1806	\N	\N	9.90	19.90	1999	1	\N	1	\N	2000	\N	\N	\N	2026-06-25 05:02:12.011	2026-06-25 10:02:49.544	\N
26	26	100只/包	HW-8065	\N	\N	9.90	19.90	1999	1	\N	1	\N	2000	\N	\N	\N	2026-06-25 05:02:12.469	2026-06-30 11:14:14.489	\N
50	50	1488克/（内含6碗）	LD-12	\N	\N	399.00	478.80	999	1	\N	1	399.00	\N	\N	\N	\N	2026-06-25 05:02:12.939	2026-06-30 11:14:51.195	\N
55	55	33g左右/只（14-16只） 1斤装	SKU00011782736671433	\N	\N	499.00	499.00	2000	0	\N	1	\N	\N	\N	\N	\N	2026-06-29 12:37:51.435	2026-06-29 12:37:51.435	\N
58	58	100g	SKU00041782736671472	\N	\N	5888.00	5888.00	1000	0	\N	1	\N	\N	\N	\N	\N	2026-06-29 12:37:51.472	2026-06-29 12:37:51.472	\N
59	59	250g	SKU00051782736671483	\N	\N	15999.00	15999.00	1000	0	\N	1	\N	\N	\N	\N	\N	2026-06-29 12:37:51.484	2026-06-29 12:37:51.484	\N
60	60	500g	SKU00061782736671498	\N	\N	28888.00	28888.00	1000	0	\N	1	\N	\N	\N	\N	\N	2026-06-29 12:37:51.499	2026-06-29 12:37:51.499	\N
56	56	55g左右/只（8-10只） 1斤装	SKU00021782736671447	\N	\N	629.00	629.00	1999	1	\N	1	\N	\N	\N	\N	\N	2026-06-29 12:37:51.448	2026-06-30 10:58:14.085	\N
3	3	20张/包*5包	HW-1820	\N	\N	9.90	19.90	2001	-1	\N	1	\N	2000	\N	\N	\N	2026-06-25 05:02:12.056	2026-07-01 11:14:00.483	\N
53	53	800克/（内含8瓶）	LD-15	\N	\N	359.00	430.80	994	6	\N	1	359.00	\N	\N	\N	\N	2026-06-25 05:02:12.993	2026-06-30 10:58:28.764	\N
54	54	10斤装（内含5条左右大鱼）	CG-FISH-10	\N	\N	299.00	399.00	492	8	\N	1	399.00	\N	\N	\N	\N	2026-06-25 05:02:13.322	2026-07-02 03:17:17.119	\N
61	61	10只	SKU00071782736671509	\N	\N	2598.00	2598.00	1000	0	\N	1	\N	\N	\N	\N	\N	2026-06-29 12:37:51.51	2026-06-29 12:37:51.51	\N
62	62	20只	SKU00081782736671521	\N	\N	5188.00	5188.00	1000	0	\N	1	\N	\N	\N	\N	\N	2026-06-29 12:37:51.523	2026-06-29 12:37:51.523	\N
63	63	30只	SKU00091782736671534	\N	\N	7888.00	7888.00	1000	0	\N	1	\N	\N	\N	\N	\N	2026-06-29 12:37:51.535	2026-06-29 12:37:51.535	\N
64	64	1548克/（内含6碗）	SKU00101782736671546	\N	\N	359.00	359.00	1000	0	\N	1	\N	\N	\N	\N	\N	2026-06-29 12:37:51.547	2026-06-29 12:37:51.547	\N
65	65	1488克/（内含6碗）	SKU00111782736671555	\N	\N	399.00	399.00	1000	0	\N	1	\N	\N	\N	\N	\N	2026-06-29 12:37:51.556	2026-06-29 12:37:51.556	\N
66	66	1488克/（内含6碗）	SKU00121782736671566	\N	\N	359.00	359.00	1000	0	\N	1	\N	\N	\N	\N	\N	2026-06-29 12:37:51.566	2026-06-29 12:37:51.566	\N
67	67	1488克/（内含6碗）	SKU00131782736671577	\N	\N	359.00	359.00	1000	0	\N	1	\N	\N	\N	\N	\N	2026-06-29 12:37:51.577	2026-06-29 12:37:51.577	\N
39	39	500g/包*2	LY-15	\N	\N	19.90	29.90	999	1	\N	1	\N	\N	\N	\N	\N	2026-06-25 05:02:12.705	2026-06-30 11:14:51.196	\N
68	68	800克/（内含8瓶）	SKU00141782736671586	\N	\N	359.00	359.00	997	3	\N	1	\N	\N	\N	\N	\N	2026-06-29 12:37:51.586	2026-07-02 03:17:17.119	\N
\.


--
-- Data for Name: product_trace; Type: TABLE DATA; Schema: public; Owner: farm
--

COPY public.product_trace (id, product_id, trace_code, trace_desc, trace_json, created_at) FROM stdin;
1	1	TRACE1	产品通过出厂安全质检	{"skuId": "1", "traceCode": "TRACE1"}	2026-06-25 05:02:12.02
2	2	TRACE2	产品通过出厂安全质检	{"skuId": "2", "traceCode": "TRACE2"}	2026-06-25 05:02:12.039
3	3	TRACE3	产品通过出厂安全质检	{"skuId": "3", "traceCode": "TRACE3"}	2026-06-25 05:02:12.059
4	4	TRACE4	产品通过出厂安全质检	{"skuId": "4", "traceCode": "TRACE4"}	2026-06-25 05:02:12.081
5	5	TRACE5	产品通过出厂安全质检	{"skuId": "5", "traceCode": "TRACE5"}	2026-06-25 05:02:12.101
6	6	TRACE6	产品通过出厂安全质检	{"skuId": "6", "traceCode": "TRACE6"}	2026-06-25 05:02:12.119
7	7	TRACE7	产品通过出厂安全质检	{"skuId": "7", "traceCode": "TRACE7"}	2026-06-25 05:02:12.137
8	8	TRACE8	产品通过出厂安全质检	{"skuId": "8", "traceCode": "TRACE8"}	2026-06-25 05:02:12.155
9	9	TRACE9	产品通过出厂安全质检	{"skuId": "9", "traceCode": "TRACE9"}	2026-06-25 05:02:12.17
10	10	TRACE10	产品通过出厂安全质检	{"skuId": "10", "traceCode": "TRACE10"}	2026-06-25 05:02:12.188
11	11	TRACE11	产品通过出厂安全质检	{"skuId": "11", "traceCode": "TRACE11"}	2026-06-25 05:02:12.207
12	12	TRACE12	产品通过出厂安全质检	{"skuId": "12", "traceCode": "TRACE12"}	2026-06-25 05:02:12.227
13	13	TRACE13	产品通过出厂安全质检	{"skuId": "13", "traceCode": "TRACE13"}	2026-06-25 05:02:12.244
14	14	TRACE14	产品通过出厂安全质检	{"skuId": "14", "traceCode": "TRACE14"}	2026-06-25 05:02:12.263
15	15	TRACE15	产品通过出厂安全质检	{"skuId": "15", "traceCode": "TRACE15"}	2026-06-25 05:02:12.283
16	16	TRACE16	产品通过出厂安全质检	{"skuId": "16", "traceCode": "TRACE16"}	2026-06-25 05:02:12.297
17	17	TRACE17	产品通过出厂安全质检	{"skuId": "17", "traceCode": "TRACE17"}	2026-06-25 05:02:12.317
18	18	TRACE18	产品通过出厂安全质检	{"skuId": "18", "traceCode": "TRACE18"}	2026-06-25 05:02:12.334
19	19	TRACE19	产品通过出厂安全质检	{"skuId": "19", "traceCode": "TRACE19"}	2026-06-25 05:02:12.349
20	20	TRACE20	产品通过出厂安全质检	{"skuId": "20", "traceCode": "TRACE20"}	2026-06-25 05:02:12.363
21	21	TRACE21	产品通过出厂安全质检	{"skuId": "21", "traceCode": "TRACE21"}	2026-06-25 05:02:12.383
22	22	TRACE22	产品通过出厂安全质检	{"skuId": "22", "traceCode": "TRACE22"}	2026-06-25 05:02:12.402
23	23	TRACE23	产品通过出厂安全质检	{"skuId": "23", "traceCode": "TRACE23"}	2026-06-25 05:02:12.423
24	24	TRACE24	产品通过出厂安全质检	{"skuId": "24", "traceCode": "TRACE24"}	2026-06-25 05:02:12.441
25	25	TRACE25	产品通过出厂安全质检	{"skuId": "25", "traceCode": "TRACE25"}	2026-06-25 05:02:12.456
26	26	TRACE26	产品通过出厂安全质检	{"skuId": "26", "traceCode": "TRACE26"}	2026-06-25 05:02:12.472
27	27	TRACE27	产品通过出厂安全质检	{"skuId": "27", "traceCode": "TRACE27"}	2026-06-25 05:02:12.491
28	28	TRACE28	产品通过出厂安全质检	{"skuId": "28", "traceCode": "TRACE28"}	2026-06-25 05:02:12.508
29	29	TRACE29	产品通过出厂安全质检	{"skuId": "29", "traceCode": "TRACE29"}	2026-06-25 05:02:12.528
30	30	TRACE30	产品通过出厂安全质检	{"skuId": "30", "traceCode": "TRACE30"}	2026-06-25 05:02:12.546
31	31	TRACE31	产品通过出厂安全质检	{"skuId": "31", "traceCode": "TRACE31"}	2026-06-25 05:02:12.567
32	32	TRACE32	产品通过出厂安全质检	{"skuId": "32", "traceCode": "TRACE32"}	2026-06-25 05:02:12.585
33	33	TRACE33	产品通过出厂安全质检	{"skuId": "33", "traceCode": "TRACE33"}	2026-06-25 05:02:12.604
34	34	TRACE34	产品通过出厂安全质检	{"skuId": "34", "traceCode": "TRACE34"}	2026-06-25 05:02:12.625
35	35	TRACE35	产品通过出厂安全质检	{"skuId": "35", "traceCode": "TRACE35"}	2026-06-25 05:02:12.643
36	36	TRACE36	产品通过出厂安全质检	{"skuId": "36", "traceCode": "TRACE36"}	2026-06-25 05:02:12.66
37	37	TRACE37	产品通过出厂安全质检	{"skuId": "37", "traceCode": "TRACE37"}	2026-06-25 05:02:12.675
38	38	TRACE38	产品通过出厂安全质检	{"skuId": "38", "traceCode": "TRACE38"}	2026-06-25 05:02:12.694
39	39	TRACE39	产品通过出厂安全质检	{"skuId": "39", "traceCode": "TRACE39"}	2026-06-25 05:02:12.709
40	40	TRACE40	配料符合国家标准：辽参、纯净水	{"skuId": "40", "traceCode": "TRACE40"}	2026-06-25 05:02:12.727
41	41	TRACE41	配料符合国家标准：辽参、纯净水	{"skuId": "41", "traceCode": "TRACE41"}	2026-06-25 05:02:12.748
42	42	TRACE42	配料符合国家标准：辽参、纯净水	{"skuId": "42", "traceCode": "TRACE42"}	2026-06-25 05:02:12.766
43	43	TRACE43	配料符合国家标准：辽参、食用盐	{"skuId": "43", "traceCode": "TRACE43"}	2026-06-25 05:02:12.788
44	44	TRACE44	配料符合国家标准：辽参、食用盐	{"skuId": "44", "traceCode": "TRACE44"}	2026-06-25 05:02:12.807
45	45	TRACE45	配料符合国家标准：辽参、食用盐	{"skuId": "45", "traceCode": "TRACE45"}	2026-06-25 05:02:12.826
46	46	TRACE46	配料符合国家标准：辽参、食用盐	{"skuId": "46", "traceCode": "TRACE46"}	2026-06-25 05:02:12.847
47	47	TRACE47	配料符合国家标准：辽参、食用盐	{"skuId": "47", "traceCode": "TRACE47"}	2026-06-25 05:02:12.877
48	48	TRACE48	配料符合国家标准：辽参、食用盐	{"skuId": "48", "traceCode": "TRACE48"}	2026-06-25 05:02:12.909
49	49	TRACE49	配料符合国家标准：生活饮用水、红豆沙馅（红小豆、生活饮用水、冰\n糖）、海参、红小豆、银耳、冰糖、红枣、枸杞、陈皮	{"skuId": "49", "traceCode": "TRACE49"}	2026-06-25 05:02:12.926
50	50	TRACE50	配料符合国家标准：生活饮用水、黑豆、海参、银耳、黑芝麻、黑枣、蓝莓、黑果枸杞、桑椹、冰糖	{"skuId": "50", "traceCode": "TRACE50"}	2026-06-25 05:02:12.942
51	51	TRACE51	配料符合国家标准：生活饮用水、海参、银耳、红枣、燕窝、枸杞、百香果、冰糖	{"skuId": "51", "traceCode": "TRACE51"}	2026-06-25 05:02:12.965
52	52	TRACE52	配料符合国家标准：生活饮用水、海参、花胶（鱼胶）、银耳、红枣、枸杞、百香果、冰糖	{"skuId": "52", "traceCode": "TRACE52"}	2026-06-25 05:02:12.98
53	53	TRACE53	配料符合国家标准：纯净水、银耳、海参、大枣、枸杞、冰糖	{"skuId": "53", "traceCode": "TRACE53"}	2026-06-25 05:02:12.996
54	54	TRACE54	配料符合国家标准：野生胖头鱼、冰块保鲜	{"skuId": "54", "traceCode": "TRACE54"}	2026-06-25 05:02:13.329
\.


--
-- Data for Name: product_video; Type: TABLE DATA; Schema: public; Owner: farm
--

COPY public.product_video (id, product_id, video_url, cover_url, sort_order, created_at) FROM stdin;
1	54	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363733056-9e166cd2-f1ba-4348-8c70-3b0b75034d2f.mp4	http://124.223.108.180:6004/farm-public/products/2026/06/25/1782363732998-30c2b8e4-391b-4609-86a2-d26a4311a9a9.jpg	1	2026-06-25 05:02:13.326
\.


--
-- Data for Name: qr_code_record; Type: TABLE DATA; Schema: public; Owner: farm
--

COPY public.qr_code_record (id, scene, type, ref_id, inviter_id, channel, image_url, status, expire_at, payload, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: refund_apply; Type: TABLE DATA; Schema: public; Owner: farm
--

COPY public.refund_apply (id, refund_no, order_id, order_item_id, user_id, merchant_id, apply_type, apply_reason, apply_images, refund_amount, status, merchant_remark, admin_remark, processed_at, created_at, updated_at, deleted_at) FROM stdin;
1	RF202606070001	1	1	1	1	1	不想要了	[]	20.00	4	\N	平台判定驳回退款	2026-07-03 09:07:37.806	2026-06-25 05:02:13.411	2026-07-03 09:07:37.807	\N
\.


--
-- Data for Name: region; Type: TABLE DATA; Schema: public; Owner: farm
--

COPY public.region (id, code, parent_code, name, short_name, level, full_path, pinyin, latitude, longitude, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: role; Type: TABLE DATA; Schema: public; Owner: farm
--

COPY public.role (id, code, name, status, created_at, updated_at) FROM stdin;
1	GUEST	游客	1	2026-06-25 05:02:13.414	2026-06-25 05:02:13.414
2	USER	普通用户	1	2026-06-25 05:02:13.414	2026-06-25 05:02:13.414
3	MERCHANT	商家/农户	1	2026-06-25 05:02:13.414	2026-06-25 05:02:13.414
4	ADMIN	管理员	1	2026-06-25 05:02:13.414	2026-06-25 05:02:13.414
6	LEADER	团长	1	2026-06-28 19:33:02.497998	2026-06-28 19:33:02.497998
\.


--
-- Data for Name: system_message; Type: TABLE DATA; Schema: public; Owner: farm
--

COPY public.system_message (id, type, title, summary, content_type, content_json, cover_image_url, sender_type, sender_id, biz_type, biz_id, publish_at, status, created_at, updated_at) FROM stdin;
1	ORDER	您的订单已发货	顺丰已揽收，预计 2 天内送达。	JSON	{"link": {"id": "NO202606070001", "url": "/pages/profile/profile", "type": "order", "label": "查看订单"}, "blocks": [{"type": "text", "value": "您的订单已发货，快递员已完成揽收。"}, {"alt": "订单通知", "url": "http://124.223.108.180:6004/farm-public/demo-messages/2026/06/25/1782363866910-b021da7c-726c-42ba-b242-39f7911fb234.svg", "type": "image"}, {"type": "text", "value": "物流单号：SF1234567890"}], "preview": "您的订单已发货，预计 2 天内送达。"}	http://124.223.108.180:6004/farm-public/demo-messages/2026/06/25/1782363866910-b021da7c-726c-42ba-b242-39f7911fb234.svg	SYSTEM	\N	ORDER	NO202606070001	2026-06-25 05:04:26.909	PUBLISHED	2026-06-25 05:04:26.909	2026-06-25 05:04:26.929
2	ACTIVITY	助农专题补贴已开始	限时补贴活动已上线，进入活动页即可查看。	JSON	{"link": {"id": "activity-1", "url": "/pages/marketing/marketing", "type": "activity", "label": "去看看"}, "blocks": [{"type": "text", "value": "助农专题补贴专场已正式开始。"}, {"alt": "活动推送", "url": "http://124.223.108.180:6004/farm-public/demo-messages/2026/06/25/1782363866915-69caabaf-83c6-46f9-8b60-ea30e0e2da03.svg", "type": "image"}, {"type": "text", "value": "活动期间支持限时补贴与爆款秒杀。"}], "preview": "助农专题补贴专场已开始。"}	http://124.223.108.180:6004/farm-public/demo-messages/2026/06/25/1782363866915-69caabaf-83c6-46f9-8b60-ea30e0e2da03.svg	SYSTEM	\N	ACTIVITY	activity-1	2026-06-25 00:04:26.909	PUBLISHED	2026-06-25 00:04:26.909	2026-06-25 05:04:26.943
3	NOTICE	系统公告	平台将在今晚进行短时维护。	JSON	{"blocks": [{"type": "text", "value": "平台将于今晚 23:30 至 23:50 进行短时维护。"}, {"type": "text", "value": "维护期间部分接口可能短暂不可用，请提前安排操作。"}], "preview": "平台将在今晚进行短时维护。"}	\N	SYSTEM	\N	SYSTEM	notice-1	2026-06-24 03:04:26.909	PUBLISHED	2026-06-24 03:04:26.909	2026-06-25 05:04:26.952
\.


--
-- Data for Name: system_setting; Type: TABLE DATA; Schema: public; Owner: farm
--

COPY public.system_setting (id, key, value, created_at, updated_at) FROM stdin;
1	siteName	湾源农仓运营管理后台	2026-06-25 05:02:13.346	2026-06-25 05:02:13.346
2	customerServiceHotline	400-800-2026	2026-06-25 05:02:13.346	2026-06-25 05:02:13.346
3	platformOfficialMerchantName	浔源农仓	2026-06-25 05:02:13.346	2026-06-25 05:02:13.346
4	auditMode	STRICT	2026-06-25 05:02:13.346	2026-06-25 05:02:13.346
5	pointsRedeemEnabled	true	2026-06-25 05:02:13.346	2026-06-25 05:02:13.346
6	pointsEarnRate	1	2026-06-25 05:02:13.346	2026-06-25 05:02:13.346
7	pointsRedeemRate	100	2026-06-25 05:02:13.346	2026-06-25 05:02:13.346
8	merchantEntryEnabled	true	2026-06-25 05:02:13.346	2026-06-25 05:02:13.346
9	platformSupportMerchantId	1	2026-06-25 05:02:13.349	2026-06-25 05:02:13.349
\.


--
-- Data for Name: user; Type: TABLE DATA; Schema: public; Owner: farm
--

COPY public."user" (id, openid, account_no, unionid, nickname, avatar_url, mobile, gender, status, last_login_at, created_at, updated_at, deleted_at) FROM stdin;
1	seed-user-openid	U202606250001	\N	示例用户	\N	13800000000	\N	1	\N	2026-06-25 05:02:11.944	2026-06-25 05:02:11.944	\N
3	guest_demo	U202606250003	\N	游客用户	\N	13000000000	\N	1	\N	2026-06-25 05:02:11.978	2026-06-25 05:02:11.978	\N
2	platform_merchant	U202606250002	\N	浔源农仓	\N	19900000000	\N	1	\N	2026-06-25 05:02:11.959	2026-07-09 15:49:21.099	\N
57	wechat_0b1ZMEkl2WfvYh4Ba5ol2PJs8f3ZMEkz	U202606290004	\N	微信用户2489	\N	\N	\N	1	2026-06-29 10:23:27.49	2026-06-28 19:07:18.017	2026-06-29 10:23:27.491	\N
41	wechat_0e3ZrFFa19fHXL0ulfIa1nWx3g0ZrFFe	U202606270011	\N	微信用户67CB	\N	\N	\N	1	2026-06-27 06:38:47.911	2026-06-27 06:38:04.889	2026-06-27 06:38:47.912	\N
34	guest_215e3c745cdc403c	U202606270004	\N	游客用户	\N	\N	\N	1	2026-06-27 06:26:05.027	2026-06-27 06:26:04.872	2026-06-27 06:26:05.027	\N
13	guest_e76713bf88764319	U202606250017	\N	游客用户	\N	\N	\N	1	2026-06-25 10:01:16.608	2026-06-25 10:01:16.609	2026-06-25 10:01:16.609	\N
29	wechat_0c3U9zll2sjJXh4Atgnl2IihK62U9zlK	U202606260002	\N	微信用户28F1	\N	\N	\N	1	2026-06-27 06:23:19.463	2026-06-26 03:18:16.857	2026-06-27 06:23:19.463	\N
14	wechat_mock_login_test	U202606250018	\N	微信用户F95D	\N	\N	\N	1	2026-06-25 10:01:52.213	2026-06-25 10:01:26.157	2026-06-25 10:01:52.214	\N
28	guest_1a9b38e609fb4a19	U202606260001	\N	游客用户	\N	\N	\N	1	2026-06-26 03:18:07.308	2026-06-26 03:18:04.472	2026-06-26 03:18:07.308	\N
19	wechat_0e3mGd100b1HBW1rZQ300LpSDJ3mGd1V	U202606250023	\N	微信用户5DE1	\N	\N	\N	1	2026-06-25 14:48:25.252	2026-06-25 13:20:35.805	2026-06-25 14:48:25.252	\N
21	wechat_test_mock_login	U202606250025	\N	微信用户263E	\N	phone_code_abc	\N	1	2026-06-25 15:01:53.056	2026-06-25 15:01:52.916	2026-06-25 15:01:53.057	\N
22	wechat_test_mock_login2	U202606250026	\N	微信用户2591	\N	\N	\N	1	2026-06-25 15:02:00.378	2026-06-25 15:02:00.378	2026-06-25 15:02:00.378	\N
47	guest_138489f8a8d04470	U202606280010	\N	游客用户	\N	\N	\N	1	2026-06-28 11:26:59.932	2026-06-28 11:26:59.933	2026-06-28 11:26:59.933	\N
24	wechat_deploy_test_login	U202606250030	\N	微信用户628D	\N	\N	\N	1	2026-06-25 15:12:03.367	2026-06-25 15:12:03.368	2026-06-25 15:12:03.368	\N
15	wechat_mock_login_test2	U202606250019	\N	微信用户904A	\N	\N	\N	1	2026-06-25 10:02:57.274	2026-06-25 10:01:56.999	2026-06-25 10:02:57.274	\N
16	guest_469f41e7fbd446a1	U202606250020	\N	游客用户	\N	\N	\N	1	2026-06-25 10:09:56.872	2026-06-25 10:09:56.872	2026-06-25 10:09:56.872	\N
25	wechat_deploy_phone_test	U202606250031	\N	微信用户1442	\N	\N	\N	1	2026-06-25 15:12:12.318	2026-06-25 15:12:12.179	2026-06-25 15:12:12.32	\N
5	guest_0032ba585f4a41c8	U202606250009	\N	游客用户	\N	\N	\N	1	2026-06-25 05:35:44.441	2026-06-25 05:35:14.096	2026-06-25 05:35:44.442	\N
8	guest_86c76f13405a4970	U202606250010	\N	游客用户	\N	\N	\N	1	2026-06-25 05:36:33.555	2026-06-25 05:36:33.555	2026-06-25 05:36:33.555	\N
37	guest_3e3fce8608834197	U202606270007	\N	游客用户	\N	\N	\N	1	2026-06-27 06:30:15.563	2026-06-27 06:29:55.636	2026-06-27 06:30:15.563	\N
26	wechat_0c3HHOFa16wgXL0ztoIa1qwP8T1HHOFk	U202606250032	\N	微信用户A299	\N	\N	\N	1	2026-06-25 15:13:18.335	2026-06-25 15:13:15.825	2026-06-25 15:13:18.335	\N
30	guest_b5642c95ccf74530	U202606260003	\N	游客用户	\N	\N	\N	1	2026-06-26 03:29:50.642	2026-06-26 03:29:50.642	2026-06-26 03:29:50.642	\N
12	guest_7b5ade033d5f4dda	U202606250016	\N	游客用户	\N	\N	\N	1	2026-06-27 05:26:25.868	2026-06-25 08:03:51.717	2026-06-27 05:26:25.868	\N
32	guest_1472cd770fbd4bcf	U202606270002	\N	游客用户	\N	\N	\N	1	2026-06-27 06:24:58.487	2026-06-27 06:24:58.324	2026-06-27 06:24:58.487	\N
56	guest_a84a5711fd4d4878	U202606290003	\N	游客用户	\N	\N	\N	1	2026-06-28 19:02:21.857	2026-06-28 18:25:29.284	2026-06-28 19:02:21.857	\N
50	guest_141b6a178b2c452d	U202606280015	\N	游客用户	\N	\N	\N	1	2026-06-28 12:07:49.767	2026-06-28 12:07:49.769	2026-06-28 12:07:49.769	\N
20	wechat_0a3UilGa10RVXL0sllGa1FdhD01UilG4	U202606250024	\N	微信用户0AA0	\N	\N	\N	1	2026-06-25 15:13:06.863	2026-06-25 14:48:42.13	2026-06-25 15:13:06.863	\N
40	guest_a491ba6202a3463a	U202606270010	\N	游客用户	\N	\N	\N	1	2026-06-27 06:37:53.891	2026-06-27 06:37:41.105	2026-06-27 06:37:53.891	\N
10	wechat_0a3cdOFa1zWoXL05XdGa1LCc8u1cdOFG	U202606250012	\N	微信用户3253	\N	\N	\N	1	2026-06-25 13:19:56.813	2026-06-25 05:45:57.303	2026-06-25 13:19:56.813	\N
17	wechat_0f3l9DHa1wvhVL06I7Ia1eLZGP1l9DHF	U202606250021	\N	微信用户5F02	\N	\N	\N	1	2026-06-25 13:20:09.291	2026-06-25 13:20:09.291	2026-06-25 13:20:09.291	\N
18	wechat_0d3BOHFa1nRcXL0bL9Ja1KGnCG1BOHFe	U202606250022	\N	微信用户9939	\N	\N	\N	1	2026-06-25 13:20:16.935	2026-06-25 13:20:16.935	2026-06-25 13:20:16.935	\N
27	wechat_0b3fQmGa1CnPXL0BrNFa1cgSZR1fQmGm	U202606250033	\N	微信用户D748	\N	\N	\N	1	2026-06-26 03:17:53.048	2026-06-25 15:13:55.262	2026-06-26 03:17:53.048	\N
9	guest_1e306d73293a48de	U202606250011	\N	游客用户	\N	\N	\N	1	2026-06-25 05:45:41.448	2026-06-25 05:36:35.061	2026-06-25 05:45:41.448	\N
38	wechat_0a38bLGa1OABWL0jjpIa1cTBSt38bLGF	U202606270008	\N	微信用户465C	\N	\N	\N	1	2026-06-27 06:35:13.711	2026-06-27 06:30:25.014	2026-06-27 06:35:13.711	\N
36	guest_5f3807794d324425	U202606270006	\N	游客用户	\N	\N	\N	1	2026-06-27 06:29:26.833	2026-06-27 06:29:26.833	2026-06-27 06:29:26.833	\N
60	wechat_0e1ewNGa1Psb0M0JT7Ha1fVOs93ewNGI	U202606290009	\N	微信用户8C74	\N	\N	\N	1	2026-06-29 10:35:21.539	2026-06-29 10:24:37.373	2026-06-29 10:35:21.54	\N
35	wechat_0b33tl000kl1DW16xG100rpuWc13tl0J	U202606270005	\N	微信用户6ECB	\N	\N	\N	1	2026-06-27 06:29:29.494	2026-06-27 06:26:51.615	2026-06-27 06:29:29.494	\N
55	wechat_0f1zLO0003UvEW1lM6300y8zqh3zLO0y	U202606290002	\N	微信用户F6AF	\N	\N	\N	1	2026-06-28 18:25:12.004	2026-06-28 18:25:06.751	2026-06-28 18:25:12.004	\N
33	guest_8b7670f111ee4d8d	U202606270003	\N	游客用户	\N	\N	\N	1	2026-06-27 06:25:44.696	2026-06-27 06:25:15.23	2026-06-27 06:25:44.696	\N
42	guest_df11dc2071934e1b	U202606270012	\N	游客用户	\N	\N	\N	1	2026-06-27 06:39:08.892	2026-06-27 06:39:00.542	2026-06-27 06:39:08.892	\N
39	guest_242b8c8e09be45ca	U202606270009	\N	游客用户	\N	\N	\N	1	2026-06-30 08:58:50.886	2026-06-27 06:35:32.529	2026-06-30 08:58:50.886	\N
59	wechat_0e1umfGa1WbwYL0y4HHa1BU5041umfGK	U202606290008	\N	微信用户	https://thirdwx.qlogo.cn/mmopen/vi_32/POgEwh4mIHO4nibH0KlMECNjjGxQUq24ZEaGT4poC6icRiccVGKSyXwibcPq4BWmiaIGuG1icwxaQX6grC9VemZoJ8rg/132	\N	\N	1	2026-06-29 10:24:25.448	2026-06-29 10:23:38.894	2026-06-29 10:24:25.448	\N
53	guest_cf098266d33e4d41	U202606280020	\N	游客用户	\N	\N	\N	1	2026-06-28 13:00:14.683	2026-06-28 13:00:14.683	2026-06-28 13:00:14.683	\N
43	guest_6d204157821342b7	U202606270013	\N	游客用户	\N	\N	\N	1	2026-06-27 06:43:56.762	2026-06-27 06:43:56.555	2026-06-27 06:43:56.763	\N
31	wechat_0e1nNh0002N3DW1rZW200R4IXN0nNh0x	U202606270001	\N	微信用户C531	\N	\N	\N	1	2026-06-28 18:21:48.552	2026-06-27 05:26:37.877	2026-06-28 18:21:48.552	\N
54	guest_582ecadb609f44ed	U202606290001	\N	游客用户	\N	\N	\N	1	2026-06-28 18:24:29.941	2026-06-28 18:24:17.441	2026-06-28 18:24:29.942	\N
61	wechat_0e1uT4Ga1ZjoYL0StsFa1jgh4H2uT4Gk	U202606290010	\N	微信用户50B0	\N	\N	\N	1	2026-06-29 12:13:29.382	2026-06-29 12:11:35.263	2026-06-29 12:13:29.382	\N
62	wechat_0e149OFa12FdZL0usnHa1rVrK6249OFZ	U202606290011	\N	微信用户489E	\N	\N	\N	1	2026-06-29 12:18:17.805	2026-06-29 12:16:30.54	2026-06-29 12:18:17.806	\N
63	wechat_0f1lIFll2BQBYh4YgGml2wPDdD1lIFlH	U202606290012	\N	微信用户37B3	\N	\N	\N	1	2026-06-29 12:26:44.061	2026-06-29 12:19:20.465	2026-06-29 12:26:44.062	\N
65	guest_bcd94e7e20ae4241	U202606290014	\N	游客用户	\N	\N	\N	1	2026-06-29 14:58:04.468	2026-06-29 14:58:04.468	2026-06-29 14:58:04.468	\N
48	wechat_123	U202606280011	\N	微信用户ACAD	\N	\N	\N	1	2026-06-29 14:58:06.139	2026-06-28 11:27:33.152	2026-06-29 14:58:06.139	\N
67	wechat_test-1782745269864-7058	U202606290016	\N	微信用户A55D	\N	\N	\N	1	2026-06-29 15:01:10.276	2026-06-29 15:01:10.276	2026-06-29 15:01:10.276	\N
66	wechat_test-leader-flow	U202606290015	\N	微信用户36E4	\N	\N	\N	1	2026-06-29 15:00:57.753	2026-06-29 15:00:10.387	2026-06-29 15:00:57.754	\N
69	guest_07fdd124bda94000	U202606290018	\N	游客用户	\N	\N	\N	1	2026-06-29 15:09:39.527	2026-06-29 15:09:39.527	2026-06-29 15:09:39.527	\N
68	wechat_test-1782745411714-7018	U202606290017	\N	微信用户5D83	\N	\N	\N	1	2026-06-29 15:03:33.344	2026-06-29 15:03:32.134	2026-06-29 15:03:33.345	\N
109	guest_faf66c3ea514444d	U202607090009	\N	游客用户	\N	\N	\N	1	2026-07-09 14:12:39.408	2026-07-09 14:12:39.234	2026-07-09 14:12:39.408	\N
99	guest_77e82c2528c24df1	U202607020003	\N	游客用户	\N	\N	\N	1	2026-07-02 02:39:44.404	2026-07-02 02:39:44.404	2026-07-03 02:52:09.64	\N
52	wechat_0f3jlAGa1jOLZL00s0Ha1dnpR04jlAGC	U202606280019	\N	微信用户A594	\N	\N	\N	1	2026-06-30 08:54:07.288	2026-06-28 12:10:02.426	2026-06-30 08:54:07.288	\N
85	wechat_0d3MHVFa12dHYL0RksIa1sJghv1MHVFH	U202606300046	\N	微信用户3105	\N	\N	\N	1	2026-06-30 08:58:58.725	2026-06-30 08:58:58.726	2026-06-30 08:58:58.726	\N
86	wechat_0f3zXXkl2u8UYh4PeMnl2rlhuF1zXXkD	U202606300047	\N	微信用户EF2F	\N	\N	\N	1	2026-06-30 08:59:03.759	2026-06-30 08:59:03.759	2026-06-30 08:59:03.759	\N
105	wechat_0a3etrFa1L5A2M07mEHa1RBYdo3etrF6	U202607090003	\N	微信用户CC01	\N	13802207727	\N	1	2026-07-09 13:04:34.795	2026-07-09 13:04:29.71	2026-07-09 13:07:31.842	\N
101	phone_13875167722	U202607030001	\N	手机号用户8802	\N	13875167722	\N	1	2026-07-03 03:59:15.609	2026-07-03 03:58:45.138	2026-07-03 03:59:15.61	\N
87	guest_1497ad6416f945be	U202606300048	\N	游客用户	\N	\N	\N	1	2026-06-30 08:59:16.756	2026-06-30 08:59:15.697	2026-06-30 08:59:16.756	\N
89	wechat_0b3w1uGa1Tfl0M09fTHa1aI09B4w1uG6	U202606300052	\N	微信用户4AC0	\N	\N	\N	1	2026-06-30 09:02:35.98	2026-06-30 09:02:35.98	2026-06-30 09:02:35.98	\N
90	wechat_0c37Yn1w3dIHk73b9A1w3R57dG07Yn1C	U202606300053	\N	微信用户FFA3	\N	13827850600	\N	1	2026-06-30 09:10:29.057	2026-06-30 09:07:30.178	2026-06-30 09:10:29.059	\N
98	wechat_0d3H4FIa1fqV0M0ZvLIa12C99p0H4FIF	U202607020002	\N	微信用户682F	\N	13836065084	\N	1	2026-07-03 02:59:19.717	2026-07-02 02:37:12.151	2026-07-03 02:59:19.717	\N
94	wechat_0f3PvJ00087ODW1m84200DtaA62PvJ07	U202606300059	\N	手机号用户FF78	\N	13866380268	\N	1	2026-07-09 13:08:04.893	2026-06-30 10:55:31.429	2026-07-09 13:08:04.893	\N
64	merchant_1782736671357_73vb0c	UR202606290013	\N	手机号用户C896	\N	19736671377	\N	1	2026-07-09 15:21:55.675	2026-06-29 12:37:51.379	2026-07-09 15:21:55.675	\N
92	wechat_0e3C1z0w3lEjj73m6n3w3ssKiq0C1z0g	U202606300057	\N	微信用户E89D	\N	13804882670	\N	1	2026-06-30 10:52:46.983	2026-06-30 09:10:50.11	2026-06-30 10:52:46.983	\N
114	guest_be437bf3d8924097	U202607090018	\N	游客用户	\N	\N	\N	1	2026-07-09 15:25:04.891	2026-07-09 15:25:04.891	2026-07-09 15:25:04.891	\N
103	guest_c917615d0cf6485f	U202607090001	\N	游客用户	\N	\N	\N	1	2026-07-09 12:26:24.059	2026-07-09 12:26:18.451	2026-07-09 12:26:24.059	\N
96	wechat_0b3UwVll26160i4w6jol2aPXXM0UwVls	U202606300063	\N	微信用户A513	\N	13870817823	\N	1	2026-07-02 02:35:35.318	2026-06-30 11:17:12.755	2026-07-02 02:35:35.318	\N
104	wechat_0d3uRz0w3aMCm73pBB1w33CPpB2uRz0w	U202607090002	\N	微信用户9E73	\N	13815061824	\N	1	2026-07-09 12:26:49.191	2026-07-09 12:26:42.399	2026-07-09 12:26:49.192	\N
93	wechat_0d3KsJ000e3ODW13NL200k70Ep4KsJ0j	U202606300058	\N	微信用户0DFF	\N	13851885453	\N	1	2026-06-30 10:55:22.019	2026-06-30 10:54:42.7	2026-06-30 10:55:22.019	\N
107	guest_a73c0a5f1d574ec2	U202607090007	\N	游客用户	\N	\N	\N	1	2026-07-09 14:06:21.992	2026-07-09 14:06:21.779	2026-07-09 14:06:21.993	\N
111	test_openid	U202607090014	\N	微信用户	\N	\N	\N	1	2026-07-09 15:19:47.852	2026-07-09 14:26:19.214	2026-07-09 15:19:47.852	\N
97	guest_c77c8ba6fa5640e9	U202607020001	\N	游客用户	\N	\N	\N	1	2026-07-02 02:36:57.131	2026-07-02 02:36:42.762	2026-07-02 02:36:57.131	\N
108	oJr7yxQzXxhXrcYGewGO1MlxVYKs	U202607090008	\N	手机号用户0C37	http://124.223.108.180:6004/farm-public/uploads/2026/07/09/1783606452339-201aaaa1-b7ad-482f-bbe1-19dee6647cc1.jpg	18706075626	\N	1	2026-07-10 01:38:11.768	2026-07-09 14:06:31.156	2026-07-10 01:38:11.768	\N
115	guest_9a315941d06446cc	U202607090019	\N	游客用户	\N	\N	\N	1	2026-07-09 15:49:21.178	2026-07-09 15:49:20.958	2026-07-09 15:49:21.178	\N
110	guest_7c12d30100874102	U202607090010	\N	游客用户	\N	\N	\N	1	2026-07-09 14:17:36.953	2026-07-09 14:17:36.767	2026-07-09 14:17:36.953	\N
118	oJr7yxR70BheVMipSB5SjVor2iz8	U202607100002	\N	微信用户0575	\N	15375707672	\N	1	2026-07-09 18:38:34.548	2026-07-09 18:24:58.063	2026-07-09 18:38:34.549	\N
117	guest_a6de5bf8cde44ba6	U202607100001	\N	游客用户	\N	\N	\N	1	2026-07-09 18:24:29.625	2026-07-09 17:12:19.205	2026-07-09 18:24:29.625	\N
\.


--
-- Data for Name: user_address; Type: TABLE DATA; Schema: public; Owner: farm
--

COPY public.user_address (id, user_id, receiver_name, receiver_mobile, province, city, district, detail_address, is_default, region_code, street_name, latitude, longitude, tag, created_at, updated_at, deleted_at) FROM stdin;
1	1	示例用户	13800000000	广东	深圳	南山	示例路 1 号	t	\N	\N	\N	\N	\N	2026-06-25 05:02:11.95	2026-06-25 05:02:11.95	\N
2	3	游客用户	13000000000	广东	深圳	南山	湾源县示例路 88 号	t	\N	\N	\N	\N	\N	2026-06-25 05:02:11.984	2026-06-25 05:02:11.984	\N
3	10	111	11111111111	北京市	北京市	东城区	1111	f	\N	\N	\N	\N	\N	2026-06-25 09:01:38.305	2026-06-25 09:01:38.305	\N
4	27	11	15595522340	北京市	北京市	东城区	111111111	f	\N	\N	\N	\N	\N	2026-06-26 03:17:08.877	2026-06-26 03:17:08.877	\N
5	29	11	15559522314	北京市	北京市	东城区	1111111	f	\N	\N	\N	\N	\N	2026-06-26 03:18:49.235	2026-06-26 03:18:49.235	\N
6	38	1111	14789562311	浙江省	杭州市	上城区	1111111111	t	\N	\N	\N	\N	\N	2026-06-27 06:32:54.186	2026-06-27 06:32:54.186	\N
7	94	111	12345678911	北京市	北京市	东城区	1111	f	\N	\N	\N	\N	\N	2026-06-30 10:57:48.159	2026-06-30 10:57:48.159	\N
8	98	111	18796585626	北京市	北京市	东城区	11111	f	\N	\N	\N	\N	\N	2026-07-02 03:17:12.368	2026-07-02 03:17:12.368	\N
\.


--
-- Data for Name: user_coupon; Type: TABLE DATA; Schema: public; Owner: farm
--

COPY public.user_coupon (id, user_id, coupon_id, status, source_type, order_no, received_at, used_at, expired_at) FROM stdin;
1	1	1	RECEIVED	ISSUE	\N	2026-06-25 05:02:13.36	\N	\N
2	12	2	RECEIVED	ISSUE	\N	2026-06-25 08:22:23.375	\N	\N
3	10	2	RECEIVED	ISSUE	\N	2026-06-25 08:29:50.845	\N	\N
4	10	1	RECEIVED	ISSUE	\N	2026-06-25 08:29:52.169	\N	\N
6	10	4	RECEIVED	ISSUE	\N	2026-06-25 08:30:18.086	\N	\N
5	10	3	RECEIVED	ISSUE	\N	2026-06-25 08:29:53.202	\N	\N
7	12	3	RECEIVED	ISSUE	\N	2026-06-27 05:26:18.317	\N	\N
10	38	3	RECEIVED	ISSUE	\N	2026-06-27 06:31:51.232	\N	\N
8	38	2	USED	ISSUE	NO0f4c41815cb0	2026-06-27 06:31:48.612	2026-06-27 06:32:57.934	\N
9	38	1	USED	ISSUE	NOdc18316c3925	2026-06-27 06:31:50.247	2026-06-27 06:33:34.125	\N
11	94	2	RECEIVED	ISSUE	\N	2026-06-30 10:56:25.448	\N	\N
12	94	1	RECEIVED	ISSUE	\N	2026-06-30 10:56:26.05	\N	\N
13	94	3	USED	ISSUE	NO9364ec4d3366	2026-06-30 10:56:26.622	2026-06-30 10:58:14.086	\N
14	94	4	USED	ISSUE	NO21c19a1e1599	2026-06-30 11:14:42.354	2026-06-30 11:14:51.197	\N
16	98	1	RECEIVED	ISSUE	\N	2026-07-02 03:16:32.231	\N	\N
17	98	3	RECEIVED	ISSUE	\N	2026-07-02 03:16:32.906	\N	\N
15	98	2	USED	ISSUE	NO6264e0e49e88	2026-07-02 03:16:31.586	2026-07-02 03:17:17.121	\N
\.


--
-- Data for Name: user_message; Type: TABLE DATA; Schema: public; Owner: farm
--

COPY public.user_message (id, user_id, message_id, is_read, read_at, delivered_at, deleted_at, created_at, updated_at) FROM stdin;
1	1	1	f	\N	2026-06-25 05:04:26.909	\N	2026-06-25 05:04:26.909	2026-06-25 05:04:26.939
2	2	1	f	\N	2026-06-25 05:04:26.909	\N	2026-06-25 05:04:26.909	2026-06-25 05:04:26.939
3	3	1	f	\N	2026-06-25 05:04:26.909	\N	2026-06-25 05:04:26.909	2026-06-25 05:04:26.939
4	1	2	f	\N	2026-06-25 00:04:26.909	\N	2026-06-25 00:04:26.909	2026-06-25 05:04:26.948
5	2	2	f	\N	2026-06-25 00:04:26.909	\N	2026-06-25 00:04:26.909	2026-06-25 05:04:26.948
6	3	2	f	\N	2026-06-25 00:04:26.909	\N	2026-06-25 00:04:26.909	2026-06-25 05:04:26.948
7	1	3	f	\N	2026-06-24 03:04:26.909	\N	2026-06-24 03:04:26.909	2026-06-25 05:04:26.96
8	2	3	f	\N	2026-06-24 03:04:26.909	\N	2026-06-24 03:04:26.909	2026-06-25 05:04:26.96
9	3	3	f	\N	2026-06-24 03:04:26.909	\N	2026-06-24 03:04:26.909	2026-06-25 05:04:26.96
\.


--
-- Data for Name: user_role; Type: TABLE DATA; Schema: public; Owner: farm
--

COPY public.user_role (id, user_id, role_id, created_at) FROM stdin;
1	61	6	2026-06-29 12:13:23.046
3	64	3	2026-06-29 12:37:51.386
5	62	6	2026-06-29 15:00:43.643
7	66	6	2026-06-29 15:01:10.678
8	68	6	2026-06-29 15:03:32.401
9	67	6	2026-06-29 15:03:32.542
10	101	2	2026-07-09 23:30:31.996645
11	20	2	2026-07-09 23:30:31.996645
12	25	2	2026-07-09 23:30:31.996645
13	26	2	2026-07-09 23:30:31.996645
14	27	2	2026-07-09 23:30:31.996645
15	93	2	2026-07-09 23:30:31.996645
16	39	2	2026-07-09 23:30:31.996645
17	17	2	2026-07-09 23:30:31.996645
18	66	2	2026-07-09 23:30:31.996645
19	89	2	2026-07-09 23:30:31.996645
20	33	2	2026-07-09 23:30:31.996645
21	109	2	2026-07-09 23:30:31.996645
22	57	2	2026-07-09 23:30:31.996645
23	31	2	2026-07-09 23:30:31.996645
24	34	2	2026-07-09 23:30:31.996645
25	12	2	2026-07-09 23:30:31.996645
26	10	2	2026-07-09 23:30:31.996645
27	18	2	2026-07-09 23:30:31.996645
28	98	2	2026-07-09 23:30:31.996645
29	64	2	2026-07-09 23:30:31.996645
30	104	2	2026-07-09 23:30:31.996645
31	2	2	2026-07-09 23:30:31.996645
32	47	2	2026-07-09 23:30:31.996645
33	15	2	2026-07-09 23:30:31.996645
34	40	2	2026-07-09 23:30:31.996645
35	56	2	2026-07-09 23:30:31.996645
36	13	2	2026-07-09 23:30:31.996645
37	21	2	2026-07-09 23:30:31.996645
38	5	2	2026-07-09 23:30:31.996645
39	96	2	2026-07-09 23:30:31.996645
40	107	2	2026-07-09 23:30:31.996645
41	108	2	2026-07-09 23:30:31.996645
42	19	2	2026-07-09 23:30:31.996645
43	65	2	2026-07-09 23:30:31.996645
44	52	2	2026-07-09 23:30:31.996645
45	37	2	2026-07-09 23:30:31.996645
46	85	2	2026-07-09 23:30:31.996645
47	32	2	2026-07-09 23:30:31.996645
48	24	2	2026-07-09 23:30:31.996645
49	55	2	2026-07-09 23:30:31.996645
50	68	2	2026-07-09 23:30:31.996645
51	38	2	2026-07-09 23:30:31.996645
52	8	2	2026-07-09 23:30:31.996645
53	110	2	2026-07-09 23:30:31.996645
54	99	2	2026-07-09 23:30:31.996645
55	48	2	2026-07-09 23:30:31.996645
56	28	2	2026-07-09 23:30:31.996645
57	94	2	2026-07-09 23:30:31.996645
58	30	2	2026-07-09 23:30:31.996645
59	62	2	2026-07-09 23:30:31.996645
60	97	2	2026-07-09 23:30:31.996645
61	114	2	2026-07-09 23:30:31.996645
62	67	2	2026-07-09 23:30:31.996645
63	50	2	2026-07-09 23:30:31.996645
64	69	2	2026-07-09 23:30:31.996645
65	42	2	2026-07-09 23:30:31.996645
66	90	2	2026-07-09 23:30:31.996645
67	59	2	2026-07-09 23:30:31.996645
68	29	2	2026-07-09 23:30:31.996645
69	41	2	2026-07-09 23:30:31.996645
70	16	2	2026-07-09 23:30:31.996645
71	54	2	2026-07-09 23:30:31.996645
72	103	2	2026-07-09 23:30:31.996645
73	36	2	2026-07-09 23:30:31.996645
74	53	2	2026-07-09 23:30:31.996645
75	92	2	2026-07-09 23:30:31.996645
76	1	2	2026-07-09 23:30:31.996645
77	111	2	2026-07-09 23:30:31.996645
78	86	2	2026-07-09 23:30:31.996645
79	22	2	2026-07-09 23:30:31.996645
80	60	2	2026-07-09 23:30:31.996645
81	105	2	2026-07-09 23:30:31.996645
82	43	2	2026-07-09 23:30:31.996645
83	3	2	2026-07-09 23:30:31.996645
84	61	2	2026-07-09 23:30:31.996645
85	87	2	2026-07-09 23:30:31.996645
86	14	2	2026-07-09 23:30:31.996645
87	35	2	2026-07-09 23:30:31.996645
88	63	2	2026-07-09 23:30:31.996645
89	9	2	2026-07-09 23:30:31.996645
90	108	3	2026-07-09 23:54:08.594196
92	118	2	2026-07-09 18:24:58.067
\.


--
-- Data for Name: withdraw_apply; Type: TABLE DATA; Schema: public; Owner: farm
--

COPY public.withdraw_apply (id, merchant_id, apply_no, amount, fee, status, audited_by, audited_at, remark, created_at, updated_at) FROM stdin;
\.


--
-- Name: account_serial_id_seq; Type: SEQUENCE SET; Schema: public; Owner: farm
--

SELECT pg_catalog.setval('public.account_serial_id_seq', 218, true);


--
-- Name: activity_draft_id_seq; Type: SEQUENCE SET; Schema: public; Owner: farm
--

SELECT pg_catalog.setval('public.activity_draft_id_seq', 1, false);


--
-- Name: activity_id_seq; Type: SEQUENCE SET; Schema: public; Owner: farm
--

SELECT pg_catalog.setval('public.activity_id_seq', 3, true);


--
-- Name: activity_product_id_seq; Type: SEQUENCE SET; Schema: public; Owner: farm
--

SELECT pg_catalog.setval('public.activity_product_id_seq', 1, false);


--
-- Name: admin_operation_log_id_seq; Type: SEQUENCE SET; Schema: public; Owner: farm
--

SELECT pg_catalog.setval('public.admin_operation_log_id_seq', 52, true);


--
-- Name: admin_role_id_seq; Type: SEQUENCE SET; Schema: public; Owner: farm
--

SELECT pg_catalog.setval('public.admin_role_id_seq', 4, true);


--
-- Name: admin_user_id_seq; Type: SEQUENCE SET; Schema: public; Owner: farm
--

SELECT pg_catalog.setval('public.admin_user_id_seq', 1, true);


--
-- Name: admin_user_role_id_seq; Type: SEQUENCE SET; Schema: public; Owner: farm
--

SELECT pg_catalog.setval('public.admin_user_role_id_seq', 1, true);


--
-- Name: banner_id_seq; Type: SEQUENCE SET; Schema: public; Owner: farm
--

SELECT pg_catalog.setval('public.banner_id_seq', 2, true);


--
-- Name: cart_id_seq; Type: SEQUENCE SET; Schema: public; Owner: farm
--

SELECT pg_catalog.setval('public.cart_id_seq', 20, true);


--
-- Name: category_id_seq; Type: SEQUENCE SET; Schema: public; Owner: farm
--

SELECT pg_catalog.setval('public.category_id_seq', 10, true);


--
-- Name: chat_conversation_id_seq; Type: SEQUENCE SET; Schema: public; Owner: farm
--

SELECT pg_catalog.setval('public.chat_conversation_id_seq', 7, true);


--
-- Name: chat_message_id_seq; Type: SEQUENCE SET; Schema: public; Owner: farm
--

SELECT pg_catalog.setval('public.chat_message_id_seq', 2, true);


--
-- Name: community_leader_id_seq; Type: SEQUENCE SET; Schema: public; Owner: farm
--

SELECT pg_catalog.setval('public.community_leader_id_seq', 10, true);


--
-- Name: coupon_id_seq; Type: SEQUENCE SET; Schema: public; Owner: farm
--

SELECT pg_catalog.setval('public.coupon_id_seq', 4, true);


--
-- Name: delivery_record_id_seq; Type: SEQUENCE SET; Schema: public; Owner: farm
--

SELECT pg_catalog.setval('public.delivery_record_id_seq', 2, true);


--
-- Name: favorite_id_seq; Type: SEQUENCE SET; Schema: public; Owner: farm
--

SELECT pg_catalog.setval('public.favorite_id_seq', 1, true);


--
-- Name: feedback_id_seq; Type: SEQUENCE SET; Schema: public; Owner: farm
--

SELECT pg_catalog.setval('public.feedback_id_seq', 1, false);


--
-- Name: flash_sale_claim_id_seq; Type: SEQUENCE SET; Schema: public; Owner: farm
--

SELECT pg_catalog.setval('public.flash_sale_claim_id_seq', 5, true);


--
-- Name: flash_sale_item_id_seq; Type: SEQUENCE SET; Schema: public; Owner: farm
--

SELECT pg_catalog.setval('public.flash_sale_item_id_seq', 45, true);


--
-- Name: flash_sale_window_id_seq; Type: SEQUENCE SET; Schema: public; Owner: farm
--

SELECT pg_catalog.setval('public.flash_sale_window_id_seq', 13, true);


--
-- Name: group_buy_id_seq; Type: SEQUENCE SET; Schema: public; Owner: farm
--

SELECT pg_catalog.setval('public.group_buy_id_seq', 17, true);


--
-- Name: group_buy_member_id_seq; Type: SEQUENCE SET; Schema: public; Owner: farm
--

SELECT pg_catalog.setval('public.group_buy_member_id_seq', 16, true);


--
-- Name: leader_application_id_seq; Type: SEQUENCE SET; Schema: public; Owner: farm
--

SELECT pg_catalog.setval('public.leader_application_id_seq', 2, true);


--
-- Name: leader_commission_id_seq; Type: SEQUENCE SET; Schema: public; Owner: farm
--

SELECT pg_catalog.setval('public.leader_commission_id_seq', 18, true);


--
-- Name: logistics_rule_id_seq; Type: SEQUENCE SET; Schema: public; Owner: farm
--

SELECT pg_catalog.setval('public.logistics_rule_id_seq', 3, true);


--
-- Name: merchant_delivery_setting_id_seq; Type: SEQUENCE SET; Schema: public; Owner: farm
--

SELECT pg_catalog.setval('public.merchant_delivery_setting_id_seq', 1, false);


--
-- Name: merchant_id_seq; Type: SEQUENCE SET; Schema: public; Owner: farm
--

SELECT pg_catalog.setval('public.merchant_id_seq', 37, true);


--
-- Name: merchant_product_draft_id_seq; Type: SEQUENCE SET; Schema: public; Owner: farm
--

SELECT pg_catalog.setval('public.merchant_product_draft_id_seq', 1, false);


--
-- Name: merchant_qualification_id_seq; Type: SEQUENCE SET; Schema: public; Owner: farm
--

SELECT pg_catalog.setval('public.merchant_qualification_id_seq', 1, false);


--
-- Name: merchant_wallet_id_seq; Type: SEQUENCE SET; Schema: public; Owner: farm
--

SELECT pg_catalog.setval('public.merchant_wallet_id_seq', 19, true);


--
-- Name: order_item_id_seq; Type: SEQUENCE SET; Schema: public; Owner: farm
--

SELECT pg_catalog.setval('public.order_item_id_seq', 22, true);


--
-- Name: orders_id_seq; Type: SEQUENCE SET; Schema: public; Owner: farm
--

SELECT pg_catalog.setval('public.orders_id_seq', 35, true);


--
-- Name: payment_record_id_seq; Type: SEQUENCE SET; Schema: public; Owner: farm
--

SELECT pg_catalog.setval('public.payment_record_id_seq', 18, true);


--
-- Name: pickup_point_id_seq; Type: SEQUENCE SET; Schema: public; Owner: farm
--

SELECT pg_catalog.setval('public.pickup_point_id_seq', 11, true);


--
-- Name: point_log_id_seq; Type: SEQUENCE SET; Schema: public; Owner: farm
--

SELECT pg_catalog.setval('public.point_log_id_seq', 5, true);


--
-- Name: product_id_seq; Type: SEQUENCE SET; Schema: public; Owner: farm
--

SELECT pg_catalog.setval('public.product_id_seq', 68, true);


--
-- Name: product_image_id_seq; Type: SEQUENCE SET; Schema: public; Owner: farm
--

SELECT pg_catalog.setval('public.product_image_id_seq', 70, true);


--
-- Name: product_review_id_seq; Type: SEQUENCE SET; Schema: public; Owner: farm
--

SELECT pg_catalog.setval('public.product_review_id_seq', 1, false);


--
-- Name: product_sku_id_seq; Type: SEQUENCE SET; Schema: public; Owner: farm
--

SELECT pg_catalog.setval('public.product_sku_id_seq', 68, true);


--
-- Name: product_trace_id_seq; Type: SEQUENCE SET; Schema: public; Owner: farm
--

SELECT pg_catalog.setval('public.product_trace_id_seq', 54, true);


--
-- Name: product_video_id_seq; Type: SEQUENCE SET; Schema: public; Owner: farm
--

SELECT pg_catalog.setval('public.product_video_id_seq', 1, true);


--
-- Name: qr_code_record_id_seq; Type: SEQUENCE SET; Schema: public; Owner: farm
--

SELECT pg_catalog.setval('public.qr_code_record_id_seq', 1, false);


--
-- Name: refund_apply_id_seq; Type: SEQUENCE SET; Schema: public; Owner: farm
--

SELECT pg_catalog.setval('public.refund_apply_id_seq', 1, true);


--
-- Name: region_id_seq; Type: SEQUENCE SET; Schema: public; Owner: farm
--

SELECT pg_catalog.setval('public.region_id_seq', 1, false);


--
-- Name: role_id_seq; Type: SEQUENCE SET; Schema: public; Owner: farm
--

SELECT pg_catalog.setval('public.role_id_seq', 6, true);


--
-- Name: system_message_id_seq; Type: SEQUENCE SET; Schema: public; Owner: farm
--

SELECT pg_catalog.setval('public.system_message_id_seq', 3, true);


--
-- Name: system_setting_id_seq; Type: SEQUENCE SET; Schema: public; Owner: farm
--

SELECT pg_catalog.setval('public.system_setting_id_seq', 9, true);


--
-- Name: user_address_id_seq; Type: SEQUENCE SET; Schema: public; Owner: farm
--

SELECT pg_catalog.setval('public.user_address_id_seq', 8, true);


--
-- Name: user_coupon_id_seq; Type: SEQUENCE SET; Schema: public; Owner: farm
--

SELECT pg_catalog.setval('public.user_coupon_id_seq', 17, true);


--
-- Name: user_id_seq; Type: SEQUENCE SET; Schema: public; Owner: farm
--

SELECT pg_catalog.setval('public.user_id_seq', 118, true);


--
-- Name: user_message_id_seq; Type: SEQUENCE SET; Schema: public; Owner: farm
--

SELECT pg_catalog.setval('public.user_message_id_seq', 9, true);


--
-- Name: user_role_id_seq; Type: SEQUENCE SET; Schema: public; Owner: farm
--

SELECT pg_catalog.setval('public.user_role_id_seq', 92, true);


--
-- Name: withdraw_apply_id_seq; Type: SEQUENCE SET; Schema: public; Owner: farm
--

SELECT pg_catalog.setval('public.withdraw_apply_id_seq', 1, false);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: account_serial account_serial_pkey; Type: CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.account_serial
    ADD CONSTRAINT account_serial_pkey PRIMARY KEY (id);


--
-- Name: activity_draft activity_draft_pkey; Type: CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.activity_draft
    ADD CONSTRAINT activity_draft_pkey PRIMARY KEY (id);


--
-- Name: activity activity_pkey; Type: CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.activity
    ADD CONSTRAINT activity_pkey PRIMARY KEY (id);


--
-- Name: activity_product activity_product_pkey; Type: CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.activity_product
    ADD CONSTRAINT activity_product_pkey PRIMARY KEY (id);


--
-- Name: admin_operation_log admin_operation_log_pkey; Type: CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.admin_operation_log
    ADD CONSTRAINT admin_operation_log_pkey PRIMARY KEY (id);


--
-- Name: admin_role admin_role_pkey; Type: CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.admin_role
    ADD CONSTRAINT admin_role_pkey PRIMARY KEY (id);


--
-- Name: admin_user admin_user_pkey; Type: CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.admin_user
    ADD CONSTRAINT admin_user_pkey PRIMARY KEY (id);


--
-- Name: admin_user_role admin_user_role_pkey; Type: CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.admin_user_role
    ADD CONSTRAINT admin_user_role_pkey PRIMARY KEY (id);


--
-- Name: banner banner_pkey; Type: CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.banner
    ADD CONSTRAINT banner_pkey PRIMARY KEY (id);


--
-- Name: cart cart_pkey; Type: CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.cart
    ADD CONSTRAINT cart_pkey PRIMARY KEY (id);


--
-- Name: category category_pkey; Type: CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.category
    ADD CONSTRAINT category_pkey PRIMARY KEY (id);


--
-- Name: chat_conversation chat_conversation_pkey; Type: CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.chat_conversation
    ADD CONSTRAINT chat_conversation_pkey PRIMARY KEY (id);


--
-- Name: chat_message chat_message_pkey; Type: CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.chat_message
    ADD CONSTRAINT chat_message_pkey PRIMARY KEY (id);


--
-- Name: community_leader community_leader_pkey; Type: CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.community_leader
    ADD CONSTRAINT community_leader_pkey PRIMARY KEY (id);


--
-- Name: coupon coupon_pkey; Type: CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.coupon
    ADD CONSTRAINT coupon_pkey PRIMARY KEY (id);


--
-- Name: delivery_record delivery_record_pkey; Type: CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.delivery_record
    ADD CONSTRAINT delivery_record_pkey PRIMARY KEY (id);


--
-- Name: favorite favorite_pkey; Type: CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.favorite
    ADD CONSTRAINT favorite_pkey PRIMARY KEY (id);


--
-- Name: feedback feedback_pkey; Type: CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.feedback
    ADD CONSTRAINT feedback_pkey PRIMARY KEY (id);


--
-- Name: flash_sale_claim flash_sale_claim_pkey; Type: CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.flash_sale_claim
    ADD CONSTRAINT flash_sale_claim_pkey PRIMARY KEY (id);


--
-- Name: flash_sale_item flash_sale_item_pkey; Type: CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.flash_sale_item
    ADD CONSTRAINT flash_sale_item_pkey PRIMARY KEY (id);


--
-- Name: flash_sale_window flash_sale_window_pkey; Type: CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.flash_sale_window
    ADD CONSTRAINT flash_sale_window_pkey PRIMARY KEY (id);


--
-- Name: group_buy_member group_buy_member_pkey; Type: CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.group_buy_member
    ADD CONSTRAINT group_buy_member_pkey PRIMARY KEY (id);


--
-- Name: group_buy group_buy_pkey; Type: CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.group_buy
    ADD CONSTRAINT group_buy_pkey PRIMARY KEY (id);


--
-- Name: leader_application leader_application_application_no_key; Type: CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.leader_application
    ADD CONSTRAINT leader_application_application_no_key UNIQUE (application_no);


--
-- Name: leader_application leader_application_pkey; Type: CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.leader_application
    ADD CONSTRAINT leader_application_pkey PRIMARY KEY (id);


--
-- Name: leader_commission leader_commission_pkey; Type: CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.leader_commission
    ADD CONSTRAINT leader_commission_pkey PRIMARY KEY (id);


--
-- Name: logistics_rule logistics_rule_pkey; Type: CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.logistics_rule
    ADD CONSTRAINT logistics_rule_pkey PRIMARY KEY (id);


--
-- Name: merchant_delivery_setting merchant_delivery_setting_pkey; Type: CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.merchant_delivery_setting
    ADD CONSTRAINT merchant_delivery_setting_pkey PRIMARY KEY (id);


--
-- Name: merchant merchant_pkey; Type: CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.merchant
    ADD CONSTRAINT merchant_pkey PRIMARY KEY (id);


--
-- Name: merchant_product_draft merchant_product_draft_pkey; Type: CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.merchant_product_draft
    ADD CONSTRAINT merchant_product_draft_pkey PRIMARY KEY (id);


--
-- Name: merchant_qualification merchant_qualification_pkey; Type: CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.merchant_qualification
    ADD CONSTRAINT merchant_qualification_pkey PRIMARY KEY (id);


--
-- Name: merchant_wallet merchant_wallet_pkey; Type: CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.merchant_wallet
    ADD CONSTRAINT merchant_wallet_pkey PRIMARY KEY (id);


--
-- Name: order_item order_item_pkey; Type: CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.order_item
    ADD CONSTRAINT order_item_pkey PRIMARY KEY (id);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: payment_record payment_record_pkey; Type: CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.payment_record
    ADD CONSTRAINT payment_record_pkey PRIMARY KEY (id);


--
-- Name: pickup_point pickup_point_pkey; Type: CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.pickup_point
    ADD CONSTRAINT pickup_point_pkey PRIMARY KEY (id);


--
-- Name: point_log point_log_pkey; Type: CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.point_log
    ADD CONSTRAINT point_log_pkey PRIMARY KEY (id);


--
-- Name: product_image product_image_pkey; Type: CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.product_image
    ADD CONSTRAINT product_image_pkey PRIMARY KEY (id);


--
-- Name: product product_pkey; Type: CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.product
    ADD CONSTRAINT product_pkey PRIMARY KEY (id);


--
-- Name: product_review product_review_pkey; Type: CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.product_review
    ADD CONSTRAINT product_review_pkey PRIMARY KEY (id);


--
-- Name: product_sku product_sku_pkey; Type: CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.product_sku
    ADD CONSTRAINT product_sku_pkey PRIMARY KEY (id);


--
-- Name: product_trace product_trace_pkey; Type: CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.product_trace
    ADD CONSTRAINT product_trace_pkey PRIMARY KEY (id);


--
-- Name: product_video product_video_pkey; Type: CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.product_video
    ADD CONSTRAINT product_video_pkey PRIMARY KEY (id);


--
-- Name: qr_code_record qr_code_record_pkey; Type: CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.qr_code_record
    ADD CONSTRAINT qr_code_record_pkey PRIMARY KEY (id);


--
-- Name: refund_apply refund_apply_pkey; Type: CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.refund_apply
    ADD CONSTRAINT refund_apply_pkey PRIMARY KEY (id);


--
-- Name: region region_pkey; Type: CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.region
    ADD CONSTRAINT region_pkey PRIMARY KEY (id);


--
-- Name: role role_pkey; Type: CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.role
    ADD CONSTRAINT role_pkey PRIMARY KEY (id);


--
-- Name: system_message system_message_pkey; Type: CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.system_message
    ADD CONSTRAINT system_message_pkey PRIMARY KEY (id);


--
-- Name: system_setting system_setting_pkey; Type: CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.system_setting
    ADD CONSTRAINT system_setting_pkey PRIMARY KEY (id);


--
-- Name: user_address user_address_pkey; Type: CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.user_address
    ADD CONSTRAINT user_address_pkey PRIMARY KEY (id);


--
-- Name: user_coupon user_coupon_pkey; Type: CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.user_coupon
    ADD CONSTRAINT user_coupon_pkey PRIMARY KEY (id);


--
-- Name: user_message user_message_pkey; Type: CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.user_message
    ADD CONSTRAINT user_message_pkey PRIMARY KEY (id);


--
-- Name: user user_pkey; Type: CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT user_pkey PRIMARY KEY (id);


--
-- Name: user_role user_role_pkey; Type: CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.user_role
    ADD CONSTRAINT user_role_pkey PRIMARY KEY (id);


--
-- Name: withdraw_apply withdraw_apply_pkey; Type: CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.withdraw_apply
    ADD CONSTRAINT withdraw_apply_pkey PRIMARY KEY (id);


--
-- Name: account_serial_scope_date_key_key; Type: INDEX; Schema: public; Owner: farm
--

CREATE UNIQUE INDEX account_serial_scope_date_key_key ON public.account_serial USING btree (scope, date_key);


--
-- Name: activity_draft_draft_no_key; Type: INDEX; Schema: public; Owner: farm
--

CREATE UNIQUE INDEX activity_draft_draft_no_key ON public.activity_draft USING btree (draft_no);


--
-- Name: activity_draft_merchant_id_updated_at_idx; Type: INDEX; Schema: public; Owner: farm
--

CREATE INDEX activity_draft_merchant_id_updated_at_idx ON public.activity_draft USING btree (merchant_id, updated_at);


--
-- Name: activity_product_activity_id_idx; Type: INDEX; Schema: public; Owner: farm
--

CREATE INDEX activity_product_activity_id_idx ON public.activity_product USING btree (activity_id);


--
-- Name: activity_product_product_id_idx; Type: INDEX; Schema: public; Owner: farm
--

CREATE INDEX activity_product_product_id_idx ON public.activity_product USING btree (product_id);


--
-- Name: activity_status_idx; Type: INDEX; Schema: public; Owner: farm
--

CREATE INDEX activity_status_idx ON public.activity USING btree (status);


--
-- Name: admin_operation_log_action_idx; Type: INDEX; Schema: public; Owner: farm
--

CREATE INDEX admin_operation_log_action_idx ON public.admin_operation_log USING btree (action);


--
-- Name: admin_operation_log_admin_user_id_idx; Type: INDEX; Schema: public; Owner: farm
--

CREATE INDEX admin_operation_log_admin_user_id_idx ON public.admin_operation_log USING btree (admin_user_id);


--
-- Name: admin_role_code_key; Type: INDEX; Schema: public; Owner: farm
--

CREATE UNIQUE INDEX admin_role_code_key ON public.admin_role USING btree (code);


--
-- Name: admin_user_account_no_key; Type: INDEX; Schema: public; Owner: farm
--

CREATE UNIQUE INDEX admin_user_account_no_key ON public.admin_user USING btree (account_no);


--
-- Name: admin_user_mobile_idx; Type: INDEX; Schema: public; Owner: farm
--

CREATE INDEX admin_user_mobile_idx ON public.admin_user USING btree (mobile);


--
-- Name: admin_user_role_admin_role_id_idx; Type: INDEX; Schema: public; Owner: farm
--

CREATE INDEX admin_user_role_admin_role_id_idx ON public.admin_user_role USING btree (admin_role_id);


--
-- Name: admin_user_role_admin_user_id_admin_role_id_key; Type: INDEX; Schema: public; Owner: farm
--

CREATE UNIQUE INDEX admin_user_role_admin_user_id_admin_role_id_key ON public.admin_user_role USING btree (admin_user_id, admin_role_id);


--
-- Name: admin_user_role_admin_user_id_idx; Type: INDEX; Schema: public; Owner: farm
--

CREATE INDEX admin_user_role_admin_user_id_idx ON public.admin_user_role USING btree (admin_user_id);


--
-- Name: admin_user_username_key; Type: INDEX; Schema: public; Owner: farm
--

CREATE UNIQUE INDEX admin_user_username_key ON public.admin_user USING btree (username);


--
-- Name: banner_status_sort_order_idx; Type: INDEX; Schema: public; Owner: farm
--

CREATE INDEX banner_status_sort_order_idx ON public.banner USING btree (status, sort_order);


--
-- Name: cart_merchant_id_idx; Type: INDEX; Schema: public; Owner: farm
--

CREATE INDEX cart_merchant_id_idx ON public.cart USING btree (merchant_id);


--
-- Name: cart_user_id_idx; Type: INDEX; Schema: public; Owner: farm
--

CREATE INDEX cart_user_id_idx ON public.cart USING btree (user_id);


--
-- Name: cart_user_id_sku_id_key; Type: INDEX; Schema: public; Owner: farm
--

CREATE UNIQUE INDEX cart_user_id_sku_id_key ON public.cart USING btree (user_id, sku_id);


--
-- Name: category_parent_id_idx; Type: INDEX; Schema: public; Owner: farm
--

CREATE INDEX category_parent_id_idx ON public.category USING btree (parent_id);


--
-- Name: chat_conversation_buyer_id_last_message_at_idx; Type: INDEX; Schema: public; Owner: farm
--

CREATE INDEX chat_conversation_buyer_id_last_message_at_idx ON public.chat_conversation USING btree (buyer_id, last_message_at);


--
-- Name: chat_conversation_conversation_key_key; Type: INDEX; Schema: public; Owner: farm
--

CREATE UNIQUE INDEX chat_conversation_conversation_key_key ON public.chat_conversation USING btree (conversation_key);


--
-- Name: chat_conversation_last_message_id_key; Type: INDEX; Schema: public; Owner: farm
--

CREATE UNIQUE INDEX chat_conversation_last_message_id_key ON public.chat_conversation USING btree (last_message_id);


--
-- Name: chat_conversation_merchant_id_last_message_at_idx; Type: INDEX; Schema: public; Owner: farm
--

CREATE INDEX chat_conversation_merchant_id_last_message_at_idx ON public.chat_conversation USING btree (merchant_id, last_message_at);


--
-- Name: chat_conversation_order_no_idx; Type: INDEX; Schema: public; Owner: farm
--

CREATE INDEX chat_conversation_order_no_idx ON public.chat_conversation USING btree (order_no);


--
-- Name: chat_conversation_product_id_idx; Type: INDEX; Schema: public; Owner: farm
--

CREATE INDEX chat_conversation_product_id_idx ON public.chat_conversation USING btree (product_id);


--
-- Name: chat_message_conversation_id_created_at_idx; Type: INDEX; Schema: public; Owner: farm
--

CREATE INDEX chat_message_conversation_id_created_at_idx ON public.chat_message USING btree (conversation_id, created_at);


--
-- Name: chat_message_receiver_id_read_at_idx; Type: INDEX; Schema: public; Owner: farm
--

CREATE INDEX chat_message_receiver_id_read_at_idx ON public.chat_message USING btree (receiver_id, read_at);


--
-- Name: chat_message_sender_id_created_at_idx; Type: INDEX; Schema: public; Owner: farm
--

CREATE INDEX chat_message_sender_id_created_at_idx ON public.chat_message USING btree (sender_id, created_at);


--
-- Name: community_leader_application_no_key; Type: INDEX; Schema: public; Owner: farm
--

CREATE UNIQUE INDEX community_leader_application_no_key ON public.community_leader USING btree (application_no);


--
-- Name: community_leader_status_idx; Type: INDEX; Schema: public; Owner: farm
--

CREATE INDEX community_leader_status_idx ON public.community_leader USING btree (status);


--
-- Name: community_leader_user_id_key; Type: INDEX; Schema: public; Owner: farm
--

CREATE UNIQUE INDEX community_leader_user_id_key ON public.community_leader USING btree (user_id);


--
-- Name: coupon_status_idx; Type: INDEX; Schema: public; Owner: farm
--

CREATE INDEX coupon_status_idx ON public.coupon USING btree (status);


--
-- Name: delivery_record_merchant_id_idx; Type: INDEX; Schema: public; Owner: farm
--

CREATE INDEX delivery_record_merchant_id_idx ON public.delivery_record USING btree (merchant_id);


--
-- Name: delivery_record_order_id_idx; Type: INDEX; Schema: public; Owner: farm
--

CREATE INDEX delivery_record_order_id_idx ON public.delivery_record USING btree (order_id);


--
-- Name: favorite_user_id_idx; Type: INDEX; Schema: public; Owner: farm
--

CREATE INDEX favorite_user_id_idx ON public.favorite USING btree (user_id);


--
-- Name: favorite_user_id_product_id_key; Type: INDEX; Schema: public; Owner: farm
--

CREATE UNIQUE INDEX favorite_user_id_product_id_key ON public.favorite USING btree (user_id, product_id);


--
-- Name: feedback_user_id_status_idx; Type: INDEX; Schema: public; Owner: farm
--

CREATE INDEX feedback_user_id_status_idx ON public.feedback USING btree (user_id, status);


--
-- Name: flash_sale_claim_item_id_user_id_idx; Type: INDEX; Schema: public; Owner: farm
--

CREATE INDEX flash_sale_claim_item_id_user_id_idx ON public.flash_sale_claim USING btree (item_id, user_id);


--
-- Name: flash_sale_claim_user_id_idx; Type: INDEX; Schema: public; Owner: farm
--

CREATE INDEX flash_sale_claim_user_id_idx ON public.flash_sale_claim USING btree (user_id);


--
-- Name: flash_sale_item_product_id_idx; Type: INDEX; Schema: public; Owner: farm
--

CREATE INDEX flash_sale_item_product_id_idx ON public.flash_sale_item USING btree (product_id);


--
-- Name: flash_sale_item_window_id_idx; Type: INDEX; Schema: public; Owner: farm
--

CREATE INDEX flash_sale_item_window_id_idx ON public.flash_sale_item USING btree (window_id);


--
-- Name: flash_sale_item_window_id_sku_id_key; Type: INDEX; Schema: public; Owner: farm
--

CREATE UNIQUE INDEX flash_sale_item_window_id_sku_id_key ON public.flash_sale_item USING btree (window_id, sku_id);


--
-- Name: flash_sale_window_status_start_at_idx; Type: INDEX; Schema: public; Owner: farm
--

CREATE INDEX flash_sale_window_status_start_at_idx ON public.flash_sale_window USING btree (status, start_at);


--
-- Name: group_buy_group_no_key; Type: INDEX; Schema: public; Owner: farm
--

CREATE UNIQUE INDEX group_buy_group_no_key ON public.group_buy USING btree (group_no);


--
-- Name: group_buy_invite_code_idx; Type: INDEX; Schema: public; Owner: farm
--

CREATE INDEX group_buy_invite_code_idx ON public.group_buy USING btree (invite_code);


--
-- Name: group_buy_invite_code_key; Type: INDEX; Schema: public; Owner: farm
--

CREATE UNIQUE INDEX group_buy_invite_code_key ON public.group_buy USING btree (invite_code);


--
-- Name: group_buy_latitude_longitude_idx; Type: INDEX; Schema: public; Owner: farm
--

CREATE INDEX group_buy_latitude_longitude_idx ON public.group_buy USING btree (latitude, longitude);


--
-- Name: group_buy_member_group_id_user_id_key; Type: INDEX; Schema: public; Owner: farm
--

CREATE UNIQUE INDEX group_buy_member_group_id_user_id_key ON public.group_buy_member USING btree (group_id, user_id);


--
-- Name: group_buy_member_user_id_idx; Type: INDEX; Schema: public; Owner: farm
--

CREATE INDEX group_buy_member_user_id_idx ON public.group_buy_member USING btree (user_id);


--
-- Name: group_buy_product_id_status_idx; Type: INDEX; Schema: public; Owner: farm
--

CREATE INDEX group_buy_product_id_status_idx ON public.group_buy USING btree (product_id, status);


--
-- Name: group_buy_status_expire_at_idx; Type: INDEX; Schema: public; Owner: farm
--

CREATE INDEX group_buy_status_expire_at_idx ON public.group_buy USING btree (status, expire_at);


--
-- Name: leader_application_status_idx; Type: INDEX; Schema: public; Owner: farm
--

CREATE INDEX leader_application_status_idx ON public.leader_application USING btree (status);


--
-- Name: leader_application_user_id_idx; Type: INDEX; Schema: public; Owner: farm
--

CREATE INDEX leader_application_user_id_idx ON public.leader_application USING btree (user_id);


--
-- Name: leader_commission_leader_id_status_idx; Type: INDEX; Schema: public; Owner: farm
--

CREATE INDEX leader_commission_leader_id_status_idx ON public.leader_commission USING btree (leader_id, status);


--
-- Name: leader_commission_order_no_idx; Type: INDEX; Schema: public; Owner: farm
--

CREATE INDEX leader_commission_order_no_idx ON public.leader_commission USING btree (order_no);


--
-- Name: leader_commission_user_id_status_idx; Type: INDEX; Schema: public; Owner: farm
--

CREATE INDEX leader_commission_user_id_status_idx ON public.leader_commission USING btree (user_id, status);


--
-- Name: logistics_rule_active_idx; Type: INDEX; Schema: public; Owner: farm
--

CREATE INDEX logistics_rule_active_idx ON public.logistics_rule USING btree (active);


--
-- Name: merchant_delivery_setting_merchant_id_key; Type: INDEX; Schema: public; Owner: farm
--

CREATE UNIQUE INDEX merchant_delivery_setting_merchant_id_key ON public.merchant_delivery_setting USING btree (merchant_id);


--
-- Name: merchant_product_draft_draft_no_key; Type: INDEX; Schema: public; Owner: farm
--

CREATE UNIQUE INDEX merchant_product_draft_draft_no_key ON public.merchant_product_draft USING btree (draft_no);


--
-- Name: merchant_product_draft_merchant_id_deleted_at_idx; Type: INDEX; Schema: public; Owner: farm
--

CREATE INDEX merchant_product_draft_merchant_id_deleted_at_idx ON public.merchant_product_draft USING btree (merchant_id, deleted_at);


--
-- Name: merchant_product_draft_merchant_id_updated_at_idx; Type: INDEX; Schema: public; Owner: farm
--

CREATE INDEX merchant_product_draft_merchant_id_updated_at_idx ON public.merchant_product_draft USING btree (merchant_id, updated_at);


--
-- Name: merchant_qualification_merchant_id_idx; Type: INDEX; Schema: public; Owner: farm
--

CREATE INDEX merchant_qualification_merchant_id_idx ON public.merchant_qualification USING btree (merchant_id);


--
-- Name: merchant_user_id_key; Type: INDEX; Schema: public; Owner: farm
--

CREATE UNIQUE INDEX merchant_user_id_key ON public.merchant USING btree (user_id);


--
-- Name: merchant_wallet_merchant_id_key; Type: INDEX; Schema: public; Owner: farm
--

CREATE UNIQUE INDEX merchant_wallet_merchant_id_key ON public.merchant_wallet USING btree (merchant_id);


--
-- Name: order_item_order_id_idx; Type: INDEX; Schema: public; Owner: farm
--

CREATE INDEX order_item_order_id_idx ON public.order_item USING btree (order_id);


--
-- Name: order_item_product_id_idx; Type: INDEX; Schema: public; Owner: farm
--

CREATE INDEX order_item_product_id_idx ON public.order_item USING btree (product_id);


--
-- Name: orders_created_at_idx; Type: INDEX; Schema: public; Owner: farm
--

CREATE INDEX orders_created_at_idx ON public.orders USING btree (created_at);


--
-- Name: orders_group_buy_id_idx; Type: INDEX; Schema: public; Owner: farm
--

CREATE INDEX orders_group_buy_id_idx ON public.orders USING btree (group_buy_id);


--
-- Name: orders_leader_id_pickup_status_idx; Type: INDEX; Schema: public; Owner: farm
--

CREATE INDEX orders_leader_id_pickup_status_idx ON public.orders USING btree (leader_id, pickup_status);


--
-- Name: orders_merchant_id_order_status_idx; Type: INDEX; Schema: public; Owner: farm
--

CREATE INDEX orders_merchant_id_order_status_idx ON public.orders USING btree (merchant_id, order_status);


--
-- Name: orders_order_no_key; Type: INDEX; Schema: public; Owner: farm
--

CREATE UNIQUE INDEX orders_order_no_key ON public.orders USING btree (order_no);


--
-- Name: orders_parent_order_no_idx; Type: INDEX; Schema: public; Owner: farm
--

CREATE INDEX orders_parent_order_no_idx ON public.orders USING btree (parent_order_no);


--
-- Name: orders_pickup_point_id_idx; Type: INDEX; Schema: public; Owner: farm
--

CREATE INDEX orders_pickup_point_id_idx ON public.orders USING btree (pickup_point_id);


--
-- Name: orders_user_id_order_status_idx; Type: INDEX; Schema: public; Owner: farm
--

CREATE INDEX orders_user_id_order_status_idx ON public.orders USING btree (user_id, order_status);


--
-- Name: payment_record_order_no_idx; Type: INDEX; Schema: public; Owner: farm
--

CREATE INDEX payment_record_order_no_idx ON public.payment_record USING btree (order_no);


--
-- Name: payment_record_pay_no_key; Type: INDEX; Schema: public; Owner: farm
--

CREATE UNIQUE INDEX payment_record_pay_no_key ON public.payment_record USING btree (pay_no);


--
-- Name: payment_record_user_id_idx; Type: INDEX; Schema: public; Owner: farm
--

CREATE INDEX payment_record_user_id_idx ON public.payment_record USING btree (user_id);


--
-- Name: pickup_point_city_district_idx; Type: INDEX; Schema: public; Owner: farm
--

CREATE INDEX pickup_point_city_district_idx ON public.pickup_point USING btree (city, district);


--
-- Name: pickup_point_status_idx; Type: INDEX; Schema: public; Owner: farm
--

CREATE INDEX pickup_point_status_idx ON public.pickup_point USING btree (status);


--
-- Name: point_log_user_id_created_at_idx; Type: INDEX; Schema: public; Owner: farm
--

CREATE INDEX point_log_user_id_created_at_idx ON public.point_log USING btree (user_id, created_at);


--
-- Name: product_audit_status_idx; Type: INDEX; Schema: public; Owner: farm
--

CREATE INDEX product_audit_status_idx ON public.product USING btree (audit_status);


--
-- Name: product_category_id_status_idx; Type: INDEX; Schema: public; Owner: farm
--

CREATE INDEX product_category_id_status_idx ON public.product USING btree (category_id, status);


--
-- Name: product_image_product_id_idx; Type: INDEX; Schema: public; Owner: farm
--

CREATE INDEX product_image_product_id_idx ON public.product_image USING btree (product_id);


--
-- Name: product_merchant_id_status_idx; Type: INDEX; Schema: public; Owner: farm
--

CREATE INDEX product_merchant_id_status_idx ON public.product USING btree (merchant_id, status);


--
-- Name: product_review_merchant_id_created_at_idx; Type: INDEX; Schema: public; Owner: farm
--

CREATE INDEX product_review_merchant_id_created_at_idx ON public.product_review USING btree (merchant_id, created_at);


--
-- Name: product_review_merchant_id_idx; Type: INDEX; Schema: public; Owner: farm
--

CREATE INDEX product_review_merchant_id_idx ON public.product_review USING btree (merchant_id);


--
-- Name: product_review_order_id_idx; Type: INDEX; Schema: public; Owner: farm
--

CREATE INDEX product_review_order_id_idx ON public.product_review USING btree (order_id);


--
-- Name: product_review_order_item_id_key; Type: INDEX; Schema: public; Owner: farm
--

CREATE UNIQUE INDEX product_review_order_item_id_key ON public.product_review USING btree (order_item_id);


--
-- Name: product_review_product_id_created_at_idx; Type: INDEX; Schema: public; Owner: farm
--

CREATE INDEX product_review_product_id_created_at_idx ON public.product_review USING btree (product_id, created_at);


--
-- Name: product_review_product_id_idx; Type: INDEX; Schema: public; Owner: farm
--

CREATE INDEX product_review_product_id_idx ON public.product_review USING btree (product_id);


--
-- Name: product_review_user_id_created_at_idx; Type: INDEX; Schema: public; Owner: farm
--

CREATE INDEX product_review_user_id_created_at_idx ON public.product_review USING btree (user_id, created_at);


--
-- Name: product_review_user_id_idx; Type: INDEX; Schema: public; Owner: farm
--

CREATE INDEX product_review_user_id_idx ON public.product_review USING btree (user_id);


--
-- Name: product_sku_product_id_idx; Type: INDEX; Schema: public; Owner: farm
--

CREATE INDEX product_sku_product_id_idx ON public.product_sku USING btree (product_id);


--
-- Name: product_sku_sku_code_key; Type: INDEX; Schema: public; Owner: farm
--

CREATE UNIQUE INDEX product_sku_sku_code_key ON public.product_sku USING btree (sku_code);


--
-- Name: product_trace_product_id_idx; Type: INDEX; Schema: public; Owner: farm
--

CREATE INDEX product_trace_product_id_idx ON public.product_trace USING btree (product_id);


--
-- Name: product_trace_trace_code_key; Type: INDEX; Schema: public; Owner: farm
--

CREATE UNIQUE INDEX product_trace_trace_code_key ON public.product_trace USING btree (trace_code);


--
-- Name: product_video_product_id_idx; Type: INDEX; Schema: public; Owner: farm
--

CREATE INDEX product_video_product_id_idx ON public.product_video USING btree (product_id);


--
-- Name: qr_code_record_inviter_id_created_at_idx; Type: INDEX; Schema: public; Owner: farm
--

CREATE INDEX qr_code_record_inviter_id_created_at_idx ON public.qr_code_record USING btree (inviter_id, created_at);


--
-- Name: qr_code_record_scene_key; Type: INDEX; Schema: public; Owner: farm
--

CREATE UNIQUE INDEX qr_code_record_scene_key ON public.qr_code_record USING btree (scene);


--
-- Name: qr_code_record_status_expire_at_idx; Type: INDEX; Schema: public; Owner: farm
--

CREATE INDEX qr_code_record_status_expire_at_idx ON public.qr_code_record USING btree (status, expire_at);


--
-- Name: qr_code_record_type_ref_id_idx; Type: INDEX; Schema: public; Owner: farm
--

CREATE INDEX qr_code_record_type_ref_id_idx ON public.qr_code_record USING btree (type, ref_id);


--
-- Name: refund_apply_merchant_id_idx; Type: INDEX; Schema: public; Owner: farm
--

CREATE INDEX refund_apply_merchant_id_idx ON public.refund_apply USING btree (merchant_id);


--
-- Name: refund_apply_order_id_idx; Type: INDEX; Schema: public; Owner: farm
--

CREATE INDEX refund_apply_order_id_idx ON public.refund_apply USING btree (order_id);


--
-- Name: refund_apply_refund_no_key; Type: INDEX; Schema: public; Owner: farm
--

CREATE UNIQUE INDEX refund_apply_refund_no_key ON public.refund_apply USING btree (refund_no);


--
-- Name: refund_apply_status_idx; Type: INDEX; Schema: public; Owner: farm
--

CREATE INDEX refund_apply_status_idx ON public.refund_apply USING btree (status);


--
-- Name: refund_apply_user_id_idx; Type: INDEX; Schema: public; Owner: farm
--

CREATE INDEX refund_apply_user_id_idx ON public.refund_apply USING btree (user_id);


--
-- Name: region_code_key; Type: INDEX; Schema: public; Owner: farm
--

CREATE UNIQUE INDEX region_code_key ON public.region USING btree (code);


--
-- Name: region_level_idx; Type: INDEX; Schema: public; Owner: farm
--

CREATE INDEX region_level_idx ON public.region USING btree (level);


--
-- Name: region_parent_code_idx; Type: INDEX; Schema: public; Owner: farm
--

CREATE INDEX region_parent_code_idx ON public.region USING btree (parent_code);


--
-- Name: role_code_key; Type: INDEX; Schema: public; Owner: farm
--

CREATE UNIQUE INDEX role_code_key ON public.role USING btree (code);


--
-- Name: system_message_status_publish_at_idx; Type: INDEX; Schema: public; Owner: farm
--

CREATE INDEX system_message_status_publish_at_idx ON public.system_message USING btree (status, publish_at);


--
-- Name: system_message_type_publish_at_idx; Type: INDEX; Schema: public; Owner: farm
--

CREATE INDEX system_message_type_publish_at_idx ON public.system_message USING btree (type, publish_at);


--
-- Name: system_setting_key_key; Type: INDEX; Schema: public; Owner: farm
--

CREATE UNIQUE INDEX system_setting_key_key ON public.system_setting USING btree (key);


--
-- Name: user_account_no_key; Type: INDEX; Schema: public; Owner: farm
--

CREATE UNIQUE INDEX user_account_no_key ON public."user" USING btree (account_no);


--
-- Name: user_address_region_code_idx; Type: INDEX; Schema: public; Owner: farm
--

CREATE INDEX user_address_region_code_idx ON public.user_address USING btree (region_code);


--
-- Name: user_address_user_id_idx; Type: INDEX; Schema: public; Owner: farm
--

CREATE INDEX user_address_user_id_idx ON public.user_address USING btree (user_id);


--
-- Name: user_coupon_user_id_coupon_id_key; Type: INDEX; Schema: public; Owner: farm
--

CREATE UNIQUE INDEX user_coupon_user_id_coupon_id_key ON public.user_coupon USING btree (user_id, coupon_id);


--
-- Name: user_coupon_user_id_status_idx; Type: INDEX; Schema: public; Owner: farm
--

CREATE INDEX user_coupon_user_id_status_idx ON public.user_coupon USING btree (user_id, status);


--
-- Name: user_message_message_id_idx; Type: INDEX; Schema: public; Owner: farm
--

CREATE INDEX user_message_message_id_idx ON public.user_message USING btree (message_id);


--
-- Name: user_message_user_id_is_read_created_at_idx; Type: INDEX; Schema: public; Owner: farm
--

CREATE INDEX user_message_user_id_is_read_created_at_idx ON public.user_message USING btree (user_id, is_read, created_at);


--
-- Name: user_message_user_id_message_id_key; Type: INDEX; Schema: public; Owner: farm
--

CREATE UNIQUE INDEX user_message_user_id_message_id_key ON public.user_message USING btree (user_id, message_id);


--
-- Name: user_mobile_key; Type: INDEX; Schema: public; Owner: farm
--

CREATE UNIQUE INDEX user_mobile_key ON public."user" USING btree (mobile);


--
-- Name: user_openid_key; Type: INDEX; Schema: public; Owner: farm
--

CREATE UNIQUE INDEX user_openid_key ON public."user" USING btree (openid);


--
-- Name: user_role_role_id_idx; Type: INDEX; Schema: public; Owner: farm
--

CREATE INDEX user_role_role_id_idx ON public.user_role USING btree (role_id);


--
-- Name: user_role_user_id_idx; Type: INDEX; Schema: public; Owner: farm
--

CREATE INDEX user_role_user_id_idx ON public.user_role USING btree (user_id);


--
-- Name: user_role_user_id_role_id_key; Type: INDEX; Schema: public; Owner: farm
--

CREATE UNIQUE INDEX user_role_user_id_role_id_key ON public.user_role USING btree (user_id, role_id);


--
-- Name: withdraw_apply_apply_no_key; Type: INDEX; Schema: public; Owner: farm
--

CREATE UNIQUE INDEX withdraw_apply_apply_no_key ON public.withdraw_apply USING btree (apply_no);


--
-- Name: withdraw_apply_merchant_id_status_idx; Type: INDEX; Schema: public; Owner: farm
--

CREATE INDEX withdraw_apply_merchant_id_status_idx ON public.withdraw_apply USING btree (merchant_id, status);


--
-- Name: activity_draft activity_draft_merchant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.activity_draft
    ADD CONSTRAINT activity_draft_merchant_id_fkey FOREIGN KEY (merchant_id) REFERENCES public.merchant(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: activity activity_merchant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.activity
    ADD CONSTRAINT activity_merchant_id_fkey FOREIGN KEY (merchant_id) REFERENCES public.merchant(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: activity_product activity_product_activity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.activity_product
    ADD CONSTRAINT activity_product_activity_id_fkey FOREIGN KEY (activity_id) REFERENCES public.activity(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: activity_product activity_product_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.activity_product
    ADD CONSTRAINT activity_product_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.product(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: activity_product activity_product_sku_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.activity_product
    ADD CONSTRAINT activity_product_sku_id_fkey FOREIGN KEY (sku_id) REFERENCES public.product_sku(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: admin_operation_log admin_operation_log_admin_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.admin_operation_log
    ADD CONSTRAINT admin_operation_log_admin_user_id_fkey FOREIGN KEY (admin_user_id) REFERENCES public.admin_user(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: admin_user_role admin_user_role_admin_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.admin_user_role
    ADD CONSTRAINT admin_user_role_admin_role_id_fkey FOREIGN KEY (admin_role_id) REFERENCES public.admin_role(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: admin_user_role admin_user_role_admin_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.admin_user_role
    ADD CONSTRAINT admin_user_role_admin_user_id_fkey FOREIGN KEY (admin_user_id) REFERENCES public.admin_user(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cart cart_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.cart
    ADD CONSTRAINT cart_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.product(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cart cart_sku_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.cart
    ADD CONSTRAINT cart_sku_id_fkey FOREIGN KEY (sku_id) REFERENCES public.product_sku(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cart cart_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.cart
    ADD CONSTRAINT cart_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: category category_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.category
    ADD CONSTRAINT category_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.category(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: chat_conversation chat_conversation_buyer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.chat_conversation
    ADD CONSTRAINT chat_conversation_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES public."user"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: chat_conversation chat_conversation_last_message_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.chat_conversation
    ADD CONSTRAINT chat_conversation_last_message_id_fkey FOREIGN KEY (last_message_id) REFERENCES public.chat_message(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: chat_conversation chat_conversation_merchant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.chat_conversation
    ADD CONSTRAINT chat_conversation_merchant_id_fkey FOREIGN KEY (merchant_id) REFERENCES public."user"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: chat_conversation chat_conversation_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.chat_conversation
    ADD CONSTRAINT chat_conversation_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.product(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: chat_message chat_message_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.chat_message
    ADD CONSTRAINT chat_message_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.chat_conversation(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: chat_message chat_message_receiver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.chat_message
    ADD CONSTRAINT chat_message_receiver_id_fkey FOREIGN KEY (receiver_id) REFERENCES public."user"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: chat_message chat_message_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.chat_message
    ADD CONSTRAINT chat_message_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public."user"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: community_leader community_leader_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.community_leader
    ADD CONSTRAINT community_leader_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: delivery_record delivery_record_merchant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.delivery_record
    ADD CONSTRAINT delivery_record_merchant_id_fkey FOREIGN KEY (merchant_id) REFERENCES public.merchant(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: delivery_record delivery_record_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.delivery_record
    ADD CONSTRAINT delivery_record_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: favorite favorite_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.favorite
    ADD CONSTRAINT favorite_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.product(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: favorite favorite_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.favorite
    ADD CONSTRAINT favorite_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: feedback feedback_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.feedback
    ADD CONSTRAINT feedback_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: flash_sale_claim flash_sale_claim_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.flash_sale_claim
    ADD CONSTRAINT flash_sale_claim_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.flash_sale_item(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: flash_sale_claim flash_sale_claim_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.flash_sale_claim
    ADD CONSTRAINT flash_sale_claim_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: flash_sale_item flash_sale_item_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.flash_sale_item
    ADD CONSTRAINT flash_sale_item_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.product(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: flash_sale_item flash_sale_item_sku_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.flash_sale_item
    ADD CONSTRAINT flash_sale_item_sku_id_fkey FOREIGN KEY (sku_id) REFERENCES public.product_sku(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: flash_sale_item flash_sale_item_window_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.flash_sale_item
    ADD CONSTRAINT flash_sale_item_window_id_fkey FOREIGN KEY (window_id) REFERENCES public.flash_sale_window(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: group_buy group_buy_initiator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.group_buy
    ADD CONSTRAINT group_buy_initiator_id_fkey FOREIGN KEY (initiator_id) REFERENCES public."user"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: group_buy_member group_buy_member_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.group_buy_member
    ADD CONSTRAINT group_buy_member_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.group_buy(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: group_buy_member group_buy_member_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.group_buy_member
    ADD CONSTRAINT group_buy_member_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: group_buy group_buy_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.group_buy
    ADD CONSTRAINT group_buy_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.product(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: group_buy group_buy_sku_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.group_buy
    ADD CONSTRAINT group_buy_sku_id_fkey FOREIGN KEY (sku_id) REFERENCES public.product_sku(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: leader_commission leader_commission_leader_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.leader_commission
    ADD CONSTRAINT leader_commission_leader_id_fkey FOREIGN KEY (leader_id) REFERENCES public.community_leader(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: merchant_delivery_setting merchant_delivery_setting_merchant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.merchant_delivery_setting
    ADD CONSTRAINT merchant_delivery_setting_merchant_id_fkey FOREIGN KEY (merchant_id) REFERENCES public.merchant(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: merchant_product_draft merchant_product_draft_merchant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.merchant_product_draft
    ADD CONSTRAINT merchant_product_draft_merchant_id_fkey FOREIGN KEY (merchant_id) REFERENCES public.merchant(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: merchant_qualification merchant_qualification_merchant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.merchant_qualification
    ADD CONSTRAINT merchant_qualification_merchant_id_fkey FOREIGN KEY (merchant_id) REFERENCES public.merchant(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: merchant merchant_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.merchant
    ADD CONSTRAINT merchant_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: merchant_wallet merchant_wallet_merchant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.merchant_wallet
    ADD CONSTRAINT merchant_wallet_merchant_id_fkey FOREIGN KEY (merchant_id) REFERENCES public.merchant(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: order_item order_item_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.order_item
    ADD CONSTRAINT order_item_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: order_item order_item_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.order_item
    ADD CONSTRAINT order_item_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.product(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: order_item order_item_sku_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.order_item
    ADD CONSTRAINT order_item_sku_id_fkey FOREIGN KEY (sku_id) REFERENCES public.product_sku(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: orders orders_leader_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_leader_id_fkey FOREIGN KEY (leader_id) REFERENCES public.community_leader(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: orders orders_merchant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_merchant_id_fkey FOREIGN KEY (merchant_id) REFERENCES public.merchant(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: orders orders_pickup_point_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pickup_point_id_fkey FOREIGN KEY (pickup_point_id) REFERENCES public.pickup_point(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: orders orders_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: payment_record payment_record_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.payment_record
    ADD CONSTRAINT payment_record_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: pickup_point pickup_point_leader_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.pickup_point
    ADD CONSTRAINT pickup_point_leader_id_fkey FOREIGN KEY (leader_id) REFERENCES public.community_leader(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: point_log point_log_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.point_log
    ADD CONSTRAINT point_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: product product_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.product
    ADD CONSTRAINT product_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.category(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: product_image product_image_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.product_image
    ADD CONSTRAINT product_image_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.product(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: product product_merchant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.product
    ADD CONSTRAINT product_merchant_id_fkey FOREIGN KEY (merchant_id) REFERENCES public.merchant(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: product_review product_review_merchant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.product_review
    ADD CONSTRAINT product_review_merchant_id_fkey FOREIGN KEY (merchant_id) REFERENCES public.merchant(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: product_review product_review_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.product_review
    ADD CONSTRAINT product_review_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: product_review product_review_order_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.product_review
    ADD CONSTRAINT product_review_order_item_id_fkey FOREIGN KEY (order_item_id) REFERENCES public.order_item(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: product_review product_review_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.product_review
    ADD CONSTRAINT product_review_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.product(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: product_review product_review_sku_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.product_review
    ADD CONSTRAINT product_review_sku_id_fkey FOREIGN KEY (sku_id) REFERENCES public.product_sku(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: product_review product_review_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.product_review
    ADD CONSTRAINT product_review_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: product_sku product_sku_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.product_sku
    ADD CONSTRAINT product_sku_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.product(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: product_trace product_trace_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.product_trace
    ADD CONSTRAINT product_trace_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.product(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: product_video product_video_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.product_video
    ADD CONSTRAINT product_video_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.product(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: refund_apply refund_apply_merchant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.refund_apply
    ADD CONSTRAINT refund_apply_merchant_id_fkey FOREIGN KEY (merchant_id) REFERENCES public.merchant(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: refund_apply refund_apply_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.refund_apply
    ADD CONSTRAINT refund_apply_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: refund_apply refund_apply_order_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.refund_apply
    ADD CONSTRAINT refund_apply_order_item_id_fkey FOREIGN KEY (order_item_id) REFERENCES public.order_item(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: refund_apply refund_apply_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.refund_apply
    ADD CONSTRAINT refund_apply_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: user_address user_address_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.user_address
    ADD CONSTRAINT user_address_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: user_coupon user_coupon_coupon_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.user_coupon
    ADD CONSTRAINT user_coupon_coupon_id_fkey FOREIGN KEY (coupon_id) REFERENCES public.coupon(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: user_coupon user_coupon_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.user_coupon
    ADD CONSTRAINT user_coupon_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: user_message user_message_message_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.user_message
    ADD CONSTRAINT user_message_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.system_message(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: user_message user_message_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.user_message
    ADD CONSTRAINT user_message_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: user_role user_role_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.user_role
    ADD CONSTRAINT user_role_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.role(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: user_role user_role_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.user_role
    ADD CONSTRAINT user_role_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: withdraw_apply withdraw_apply_audited_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.withdraw_apply
    ADD CONSTRAINT withdraw_apply_audited_by_fkey FOREIGN KEY (audited_by) REFERENCES public.admin_user(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: withdraw_apply withdraw_apply_merchant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: farm
--

ALTER TABLE ONLY public.withdraw_apply
    ADD CONSTRAINT withdraw_apply_merchant_id_fkey FOREIGN KEY (merchant_id) REFERENCES public.merchant(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: farm
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;


--
-- PostgreSQL database dump complete
--

\unrestrict XSi67ZP1bJ80pBKOV9pOHOKOSSzprSuEPRXEUAeLHzDEBeHTxGO2onGU2lSyaKU

