import Vue from 'vue'
import DOMPurify from 'dompurify'

// Server and podcast feed HTML is rendered with v-html. Strip scripts and event handlers
// so a malicious feed can't run code with access to the Capacitor native bridge.
Vue.prototype.$sanitizeHtml = (html) => DOMPurify.sanitize(html || '')
