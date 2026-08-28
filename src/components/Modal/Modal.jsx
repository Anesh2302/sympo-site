import React, { useEffect, useRef } from "react";
import "./Modal.scss";
import { useModalStore } from "../../stores/useModalStore";
import { useRegisterStore } from "../../stores/useRegisterStore";
import { modalContent } from "../../data/modalContent";

const Modal = () => {
  const { isModalOpen, modalID, closeModal } = useModalStore();
  const openRegister = useRegisterStore((state) => state.openRegister);
  const modalRef = useRef(null);

  useEffect(() => {
    const handleEscapeKey = (e) => {
      if (e.key === "Escape" && isModalOpen) {
        closeModal();
      }
    };

    document.addEventListener("keydown", handleEscapeKey);

    return () => {
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, [isModalOpen, closeModal]);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        closeModal();
      }
    };

    if (isModalOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isModalOpen, closeModal]);

  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = "hidden";
      document.body.style.cursor = "auto";
    } else {
      document.body.style.overflow = "auto";
    }

    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isModalOpen]);

  if (!isModalOpen || !modalContent[modalID]) return null;

  const { title, link, linkText, paragraphs, items, action } =
    modalContent[modalID];

  const handleCta = (e) => {
    if (action === "register") {
      e.preventDefault();
      closeModal();
      openRegister();
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container" ref={modalRef}>
        <button className="modal-back-button" onClick={handleClose} aria-label="Close">
          ✕
        </button>

        <div className="modal-content">
          <h2 className="modal-title">{title}</h2>
          <div className="modal-divider" />

          <div className="modal-paragraphs">
            {paragraphs.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>

          {items && items.length > 0 && (
            <ul className="modal-items">
              {items.map((item, index) => (
                <li key={index}>
                  {item.label && (
                    <span className="modal-items__label">{item.label}</span>
                  )}
                  <span className="modal-items__text">{item.text}</span>
                </li>
              ))}
            </ul>
          )}

          {linkText && (
            <a
              href={link}
              target={action === "register" ? undefined : "_blank"}
              rel="noopener noreferrer"
              className="modal-cta"
              onClick={handleCta}
            >
              {linkText}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

export default Modal;
