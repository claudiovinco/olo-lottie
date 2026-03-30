import React from 'react';
import { createRoot } from 'react-dom/client';
import AnimationList from './AnimationList';

const container = document.getElementById('olo-lottie-list');
if (container) {
    createRoot(container).render(<AnimationList />);
}
