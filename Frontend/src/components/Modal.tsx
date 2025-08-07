import React, { createContext, useContext, useState, useCallback, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { CheckCircleIcon, XCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

// --- Types ---
type ModalType = 'alert' | 'confirm' | 'status';
type ModalTheme = 'dark' | 'light' | 'warning';
type StatusType = 'loading' | 'success' | 'error';

interface ModalOptions {
  title: string;
  message: React.ReactNode;
  type?: ModalType;
  theme?: ModalTheme;
  status?: StatusType;
  confirmText?: string;
  cancelText?: string;
  showIcon?: boolean; 
}

interface ModalState extends ModalOptions {
  isOpen: boolean;
}

// --- Context ---
interface ModalContextType {
  alert: (title: string, message: React.ReactNode, theme?: ModalTheme, showIcon?: boolean) => Promise<boolean>;
  confirm: (title: string, message: React.ReactNode, theme?: ModalTheme, showIcon?: boolean) => Promise<boolean>;
  showStatus: (status: StatusType, title: string, message: React.ReactNode) => void;
  hideStatus: () => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

// --- Provider Component ---
export const ModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [modalState, setModalState] = useState<ModalState>({ isOpen: false, title: '', message: '' });
  const [resolver, setResolver] = useState<((value: boolean) => void) | null>(null);

  const showModal = useCallback((options: ModalOptions): Promise<boolean> => {
    setModalState({ ...options, isOpen: true });
    return new Promise<boolean>((resolve) => {
      setResolver(() => resolve);
    });
  }, []);

  const handleConfirm = useCallback(() => {
    if (resolver) resolver(true);
    setModalState(prev => ({ ...prev, isOpen: false }));
  }, [resolver]);

  const handleClose = useCallback(() => {
    if (resolver) resolver(false);
    setModalState(prev => ({ ...prev, isOpen: false }));
  }, [resolver]);
  
  const alert = useCallback((title: string, message: React.ReactNode, theme: ModalTheme = 'light', showIcon: boolean = true) => {
    return showModal({ title, message, theme, type: 'alert', showIcon });
  }, [showModal]);

  const confirm = useCallback((title: string, message: React.ReactNode, theme: ModalTheme = 'light', showIcon: boolean = true) => {
    return showModal({ title, message, theme, type: 'confirm', showIcon });
  }, [showModal]);
  
  const showStatus = useCallback((status: StatusType, title: string, message: React.ReactNode) => {
    setModalState({ isOpen: true, title, message, status, type: 'status' });
    if(status !== 'loading') {
        setTimeout(() => setModalState(prev => ({...prev, isOpen: false})), 2000);
    }
  }, []);
  
  const hideStatus = useCallback(() => {
      setModalState(prev => ({...prev, isOpen: false}));
  }, []);

  const value = { alert, confirm, showStatus, hideStatus };

  return (
    <ModalContext.Provider value={value}>
      {children}
      <ModalComponent state={modalState} onConfirm={handleConfirm} onClose={handleClose} />
    </ModalContext.Provider>
  );
};

// --- Custom Hook ---
export const useModal = () => {
  const context = useContext(ModalContext);
  if (context === undefined) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
};

// --- Modal UI Component ---
const ModalComponent: React.FC<{ state: ModalState; onConfirm: () => void; onClose: () => void }> = ({ state, onConfirm, onClose }) => {
    const { isOpen, title, message, type = 'alert', theme = 'light', status = 'loading', confirmText = 'ยืนยัน', cancelText = 'ยกเลิก', showIcon = true } = state;

    const themes = {
        dark: { bg: 'bg-gray-800', text: 'text-gray-300', title: 'text-white' },
        light: { bg: 'bg-white', text: 'text-gray-600', title: 'text-gray-900' },
        warning: { bg: 'bg-yellow-50', text: 'text-yellow-700', title: 'text-yellow-900' },
    };
    const currentTheme = themes[theme];

    const renderIcon = () => {
        if (!showIcon) return null;
        if (type === 'status') {
            switch (status) {
                case 'loading': return <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mb-3" />;
                case 'success': return <CheckCircleIcon className="h-12 w-12 text-green-500 mb-3" />;
                case 'error': return <XCircleIcon className="h-12 w-12 text-red-500 mb-3" />;
                default: return null;
            }
        }
        if (type === 'alert' || type === 'confirm') {
            return <ExclamationTriangleIcon className={`h-12 w-12 mb-3 ${theme === 'warning' ? 'text-yellow-400' : 'text-blue-500'}`} />;
        }
        return null;
    };

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
                    <div className="fixed inset-0 bg-black bg-opacity-0" />
                </Transition.Child>
                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                            <Dialog.Panel className={`w-full max-w-sm transform overflow-hidden rounded-2xl ${currentTheme.bg} p-6 text-left align-middle shadow-xl transition-all`}>
                                <div className="flex flex-col items-center text-center">
                                    {renderIcon()}
                                    <Dialog.Title as="h3" className={`text-xl font-bold leading-6 ${currentTheme.title}`}>
                                        {title}
                                    </Dialog.Title>
                                    <div className={`mt-2 ${currentTheme.text}`}>
                                        <p className="text-sm">{message}</p>
                                    </div>
                                </div>
                                <div className="mt-6 flex justify-center gap-4">
                                    {type === 'confirm' && (
                                        <button type="button" className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50" onClick={onClose}>{cancelText}</button>
                                    )}
                                    {(type === 'alert' || type === 'confirm') && (
                                        <button type="button" className={`inline-flex justify-center rounded-md border border-transparent ${theme === 'warning' ? 'bg-yellow-400 hover:bg-yellow-500' : 'bg-blue-600 hover:bg-blue-700'} px-4 py-2 text-sm font-medium text-white`} onClick={onConfirm}>
                                            {type === 'confirm' ? confirmText : 'ตกลง'}
                                        </button>
                                    )}
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
};