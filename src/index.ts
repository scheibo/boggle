// https://github.com/parcel-bundler/parcel/issues/1762
import 'regenerator-runtime/runtime';

import './swipe';
import './longpress';
import './ui/debug';

import { UI } from './ui/ui';

// tslint:disable-next-line:no-floating-promises
UI.create();
