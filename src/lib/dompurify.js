const DOMPurify = {
    sanitize(html) {
        const div = document.createElement('div');
        div.innerHTML = html;
        const scripts = div.querySelectorAll('script');
        scripts.forEach((s) => s.remove());
        return div.innerHTML;
    },
};
export default DOMPurify;
