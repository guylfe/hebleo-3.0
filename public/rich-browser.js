import {marked} from '/vendor/marked.js';
import DOMPurify from '/vendor/purify.js';
import {createLessonRenderer} from './rich.js';
export const renderLesson=createLessonRenderer(marked,DOMPurify,document);
