// assets/js/components/apps/office.js
document.addEventListener('alpine:init', () => {
    // Word App Logic
    Alpine.data('wordApp', () => ({
        content: '',
        fontSize: 11,
        fontFamily: 'Calibri',
        isBold: false,
        isItalic: false,
        isUnderline: false,
        alignment: 'left',
        
        init() {
            // Load initial content from the CV partial if needed
            this.$nextTick(() => {
                const cvContent = document.querySelector('#word-document-content');
                if (cvContent) {
                    this.content = cvContent.innerText;
                }
            });
        },

        execCommand(command, value = null) {
            document.execCommand(command, false, value);
            this.updateState();
        },

        updateState() {
            this.isBold = document.queryCommandState('bold');
            this.isItalic = document.queryCommandState('italic');
            this.isUnderline = document.queryCommandState('underline');
            this.alignment = document.queryCommandValue('justifyLeft') === 'true' ? 'left' : 
                             document.queryCommandValue('justifyCenter') === 'true' ? 'center' : 
                             document.queryCommandValue('justifyRight') === 'true' ? 'right' : 'left';
        },

        print() {
            const printWindow = window.open('', '_blank');
            printWindow.document.write(`
                <html>
                    <head>
                        <title>Print Document</title>
                        <style>
                            body { font-family: ${this.fontFamily}, sans-serif; padding: 20px; }
                            @media print { .no-print { display: none; } }
                        </style>
                    </head>
                    <body>
                        ${document.querySelector('[contenteditable]').innerHTML}
                    </body>
                </html>
            `);
            printWindow.document.close();
            printWindow.print();
        }
    }));

    // Outlook App Logic
    Alpine.data('outlookApp', () => ({
        recipient: 'devante@johnson-rose.co.uk',
        subject: 'Project Inquiry - Portfolio OS',
        body: 'Hi,\n\nI was browsing your portfolio and would like to get in touch regarding...',
        isSending: false,
        attachments: [],
        honeypot: '', // Honeypot field
        
        async send() {
            if (this.isSending) return;
            if (this.honeypot) {
                console.warn('Spam detected via honeypot');
                alert('Message sent successfully!'); // Fake success for bots
                return;
            }
            
            this.isSending = true;

            try {
                const formData = new FormData();
                formData.append('recipient', this.recipient);
                formData.append('subject', this.subject);
                formData.append('body', this.body);
                formData.append('website_hp', this.honeypot);
                
                this.attachments.forEach((file, index) => {
                    formData.append(`attachment_${index}`, file);
                });

                const response = await fetch(window.portfolioConfig.basePath + 'api/send_email.php', {
                    method: 'POST',
                    body: formData
                });

                const result = await response.json();

                if (result.success) {
                    Alpine.store('os').logEvent('Outlook', 'Information', `Email sent via no-reply to ${this.recipient}`);
                    alert('Email sent successfully via our secure server!');
                    this.subject = '';
                    this.body = '';
                    this.attachments = [];
                } else {
                    alert('Error: ' + result.error);
                }
            } catch (e) {
                alert('Failed to send email. Check if the database is running.');
            } finally {
                this.isSending = false;
            }
        },

        sendViaPersonalMail() {
            const mailto = `mailto:${this.recipient}?subject=${encodeURIComponent(this.subject)}&body=${encodeURIComponent(this.body)}`;
            window.location.href = mailto;
            Alpine.store('os').logEvent('Outlook', 'Information', `External mail client opened for ${this.recipient}`);
        },

        triggerAttach() {
            this.$refs.fileInput.click();
        },

        handleFileSelect(e) {
            const files = Array.from(e.target.files);
            this.attachments.push(...files);
        },

        removeAttachment(index) {
            this.attachments.splice(index, 1);
        }
    }));
});
