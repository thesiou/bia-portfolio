// Contact form handling with Web3Forms
// SETUP INSTRUCTIONS:
// 1. Go to https://web3forms.com/
// 2. Enter your email address to get an access key instantly (no signup required!)
// 3. Check your email for the access key
// 4. Replace 'YOUR_ACCESS_KEY' below with your actual access key
// 5. That's it! The form will now send emails to your address

const WEB3FORMS_KEY = 'YOUR_ACCESS_KEY'; // Replace with your Web3Forms access key

document.addEventListener('DOMContentLoaded', () => {
    const contactForm = document.getElementById('contact-form');

    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const statusDiv = document.getElementById('form-status');
            const submitBtn = document.getElementById('submit-btn');

            // Get form data
            const formData = new FormData(contactForm);

            // Show loading state
            statusDiv.className = 'form-status loading';
            statusDiv.textContent = 'Sending message...';
            submitBtn.disabled = true;

            try {
                const response = await fetch('https://api.web3forms.com/submit', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({
                        access_key: WEB3FORMS_KEY,
                        name: formData.get('name'),
                        email: formData.get('email'),
                        subject: formData.get('subject'),
                        message: formData.get('message')
                    })
                });

                const result = await response.json();

                if (result.success) {
                    // Success
                    statusDiv.className = 'form-status success';
                    statusDiv.textContent = '✓ Message sent successfully! I\'ll get back to you soon.';
                    contactForm.reset();

                    // Hide success message after 5 seconds
                    setTimeout(() => {
                        statusDiv.className = 'form-status';
                        statusDiv.textContent = '';
                    }, 5000);
                } else {
                    // Server error
                    throw new Error('Server error');
                }
            } catch (error) {
                // Error state
                statusDiv.className = 'form-status error';

                if (WEB3FORMS_KEY === '166f1c09-6401-4bd7-878e-43a28d8345f9') {
                    statusDiv.textContent = '⚠ Please add your Web3Forms access key in contact.js first.';
                } else {
                    statusDiv.textContent = '✗ Failed to send message. Please try again or email directly at hello@biancabanu.com';
                }

                console.error('Form submission error:', error);
            } finally {
                // Re-enable submit button
                submitBtn.disabled = false;
            }
        });
    }
});

/*
ALTERNATIVE: Use Formspree (requires free account)
1. Go to https://formspree.io/ and create a free account
2. Create a new form and get your form endpoint (looks like: https://formspree.io/f/xpwzabcd)
3. Replace the code above with:

const FORMSPREE_ENDPOINT = 'https://formspree.io/f/YOUR_FORM_ID';

// In the fetch:
const response = await fetch(FORMSPREE_ENDPOINT, {
    method: 'POST',
    body: formData,
    headers: {
        'Accept': 'application/json'
    }
});
*/
