class StorageManagementApp {
    constructor() {
        this.baseURL = `${window.location.origin}/api`;
        this.token = localStorage.getItem('token');
        this.user = JSON.parse(localStorage.getItem('user') || '{}');
        this.heartbeatInterval = null;
        this.init();
        this.setupEventListeners();
    }

    async init() {
        if (this.token && this.user.id) {
            this.showMainApp();
            this.startHeartbeat();
        } else {
            this.showAuth();
        }
    }

    setupEventListeners() {
        // Detect tab close/page unload
        window.addEventListener('beforeunload', (e) => {
            if (this.token) {
                this.logout(false); // Silent logout without redirect
                this.stopHeartbeat();
            }
        });

        // Detect tab visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.stopHeartbeat();
            } else if (this.token) {
                this.startHeartbeat();
            }
        });
    }

    startHeartbeat() {
        this.stopHeartbeat(); // Clear any existing interval
        
        if (!this.token) return;
        
        this.heartbeatInterval = setInterval(async () => {
            try {
                await this.apiCall('/heartbeat', 'POST');
            } catch (error) {
                console.warn('Heartbeat failed:', error);
                // If heartbeat fails, user might be logged out
                if (error.message.includes('token') || error.message.includes('401')) {
                    this.handleLogout();
                }
            }
        }, 90000); // 90 seconds
    }

    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    async apiCall(endpoint, method = 'GET', data = null) {
        const headers = {
            'Content-Type': 'application/json',
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        const config = {
            method,
            headers,
        };

        if (data) {
            config.body = JSON.stringify(data);
        }

        try {
            const response = await fetch(`${this.baseURL}${endpoint}`, config);
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Request failed');
            }

            return result;
        } catch (error) {
            console.error('API call failed:', error);
            throw error;
        }
    }

    showAuth() {
        document.getElementById('auth-section').classList.remove('hidden');
        document.getElementById('main-app').classList.add('hidden');
        document.getElementById('user-info').classList.add('hidden');
    }

    showMainApp() {
        document.getElementById('auth-section').classList.add('hidden');
        document.getElementById('main-app').classList.remove('hidden');
        document.getElementById('user-info').classList.remove('hidden');
        document.getElementById('user-name').textContent = this.user.email || this.user.id;
        document.getElementById('user-role').textContent = this.user.role;

        if (this.user.role === 'Admin') {
            document.getElementById('admin-nav').classList.remove('hidden');
        }

        this.showDashboard();
    }

    async login(email, password) {
        try {
            const result = await this.apiCall('/auth/login', 'POST', { email, password });
            this.token = result.token;
            this.user = result.user;
            localStorage.setItem('token', this.token);
            localStorage.setItem('user', JSON.stringify(this.user));
            this.showMainApp();
            this.showMessage('auth-message', 'Login successful!', 'success');
        } catch (error) {
            this.showMessage('auth-message', error.message, 'error');
        }
    }

    async register(name, email, password, role) {
        try {
            const result = await this.apiCall('/auth/register', 'POST', { name, email, password, role });
            this.showMessage('auth-message', 'Registration successful! Please login.', 'success');
            this.showLogin();
        } catch (error) {
            this.showMessage('auth-message', error.message, 'error');
        }
    }

    async registerItem() {
        try {
            const formData = {
                Packagecode: document.getElementById('item-packagecode').value,
                Packagedescription: document.getElementById('item-packagedescription').value,
                Category: document.getElementById('item-category').value,
                'SampleCreatedByShift(A/B/C)': document.getElementById('item-shift').value,
                Dummyunit: document.getElementById('item-dummyunit').value,
                TotalSample: parseInt(document.getElementById('item-totalsample').value) || null,
                
                // Substrate defects
                'WhiteFM(Substrate)': document.getElementById('item-whitefm-substrate').value,
                'BlackFM(Substrate)': document.getElementById('item-blackfm-substrate').value,
                'Chip(Substrate)': document.getElementById('item-chip-substrate').value,
                'Scratches(Substrate)': document.getElementById('item-scratches-substrate').value,
                'Crack(Substrate)': document.getElementById('item-crack-substrate').value,
                'FMonFoot(Substrate)': document.getElementById('item-fmonfoot-substrate').value,
                'FMonShoulder(Substrate)': document.getElementById('item-fmonshoulder-substrate').value,
                'NFA(Substrate)': document.getElementById('item-nfa-substrate').value,
                'PFA(Substrate)': document.getElementById('item-pfa-substrate').value,
                'Footburr(Substrate)': document.getElementById('item-footburr-substrate').value,
                'Shoulderbur(Substrate)': document.getElementById('item-shoulderbur-substrate').value,
                'Exposecopper(Substrate)': document.getElementById('item-exposecopper-substrate').value,
                'Resinbleed(Substrate)': document.getElementById('item-resinbleed-substrate').value,
                'void(Substrate)': document.getElementById('item-void-substrate').value,
                'Copla(Substrate)': document.getElementById('item-copla-substrate').value,
                
                // Mold/MetalLid defects
                'WhiteFM(Mold/MetalLid)': document.getElementById('item-whitefm-mold').value,
                'BlackFM(Mold/MetalLid)': document.getElementById('item-blackfm-mold').value,
                'EdgeChip(Mold/MetalLid)': document.getElementById('item-edgechip-mold').value,
                'CornerChip(Mold/MetalLid)': document.getElementById('item-cornerchip-mold').value,
                'Scratches(Mold/MetalLid)': document.getElementById('item-scratches-mold').value,
                'Crack(Mold/MetalLid)': document.getElementById('item-crack-mold').value,
                'Illegiblemarking(Mold/MetalLid)': document.getElementById('item-illegiblemarking-mold').value,
                
                // Die defects
                'WhiteFM(Die)': document.getElementById('item-whitefm-die').value,
                'BlackFM(Die)': document.getElementById('item-blackfm-die').value,
                'Chip(Die)': document.getElementById('item-chip-die').value,
                'Scratches(Die)': document.getElementById('item-scratches-die').value,
                'Crack(Die)': document.getElementById('item-crack-die').value,
                
                // Bottom defects
                'WhiteFM(BottomDefect)': document.getElementById('item-whitefm-bottom').value,
                'BlackFM(BottomDefect)': document.getElementById('item-blackfm-bottom').value,
                'Chip(BottomDefect)': document.getElementById('item-chip-bottom').value,
                'Scratches(BottomDefect)': document.getElementById('item-scratches-bottom').value,
                'Crack(BottomDefect)': document.getElementById('item-crack-bottom').value,
                'Damageball(BottomDefect)': document.getElementById('item-damageball-bottom').value,
                
                // Other defects
                'Multiple Defect': document.getElementById('item-multiple-defect').value,
                Pitch: document.getElementById('item-pitch').value,
                Sliver: document.getElementById('item-sliver').value,
                'Ball Discoloration': document.getElementById('item-ball-discoloration').value,
                Burr: document.getElementById('item-burr').value,
                'FM on Dambar': document.getElementById('item-fm-dambar').value,
                'FM on Lead': document.getElementById('item-fm-lead').value,
                'Expose Copper on Dambar': document.getElementById('item-expose-copper-dambar').value,
                'Mold Flash': document.getElementById('item-mold-flash').value,
                'Metallic Particle': document.getElementById('item-metallic-particle').value,
                Patchback: document.getElementById('item-patchback').value,
                'Bent Lead': document.getElementById('item-bent-lead').value,
                'Expose Tie Bar': document.getElementById('item-expose-tie-bar').value,
                Fiber: document.getElementById('item-fiber').value,
                'Tool Mark': document.getElementById('item-tool-mark').value,
                'Good Unit': document.getElementById('item-good-unit').value,
                'Lead Shining': document.getElementById('item-lead-shining').value,
                'Acid Test Burr': document.getElementById('item-acid-test-burr').value
            };

            // Store form data temporarily for step 2
            this.tempItemData = formData;
            
            // Show cabinet selection step
            this.showCabinetSelection()
        } catch (error) {
            this.showMessage('register-item-message', error.message, 'error');
        }
    }

    showCabinetSelection() {
        // Hide the form and show cabinet selection
        document.getElementById('register-item-form').parentElement.classList.add('hidden');
        document.getElementById('cabinet-selection').classList.remove('hidden');
        
        // Load available cabinet count
        this.loadAvailableCabinetCount();
        
        // Setup radio button event listeners
        const availableRadio = document.getElementById('use-available');
        const newRadio = document.getElementById('use-new');
        
        newRadio.addEventListener('change', () => {
            if (newRadio.checked) {
                document.getElementById('new-cabinet-section').classList.remove('hidden');
            } else {
                document.getElementById('new-cabinet-section').classList.add('hidden');
            }
        });
        
        availableRadio.addEventListener('change', () => {
            if (availableRadio.checked) {
                document.getElementById('new-cabinet-section').classList.add('hidden');
            }
        });
    }

    async loadAvailableCabinetCount() {
        try {
            // Query for available cabinets count
            const result = await this.apiCall('/items/available-cabinets');
            const countSpan = document.getElementById('available-count');
            
            if (result.cabinets && result.cabinets.length > 0) {
                countSpan.textContent = `${result.cabinets.length} cabinets available`;
                countSpan.style.color = 'green';
            } else {
                countSpan.textContent = 'No available cabinets found';
                countSpan.style.color = 'red';
                // Disable the auto-assign option
                document.getElementById('use-available').disabled = true;
                document.getElementById('use-new').checked = true;
                document.getElementById('new-cabinet-section').classList.remove('hidden');
            }
        } catch (error) {
            console.error('Error loading available cabinets:', error);
            document.getElementById('available-count').textContent = 'Error loading cabinet info';
            document.getElementById('available-count').style.color = 'red';
        }
    }

    goBackToForm() {
        document.getElementById('cabinet-selection').classList.add('hidden');
        document.getElementById('register-item-form').parentElement.classList.remove('hidden');
    }

    async finalizeRegistration() {
        try {
            const selectedOption = document.querySelector('input[name="cabinet-option"]:checked');
            if (!selectedOption) {
                this.showMessage('cabinet-message', 'Please select a cabinet option', 'error');
                return;
            }

            let method, endpoint;
            
            if (selectedOption.value === 'available') {
                // Use auto-assign endpoint - backend will randomly select an available cabinet
                method = 'POST';
                endpoint = '/items/register-auto-assign';
            } else {
                const cabinetId = document.getElementById('new-cabinet-input').value.trim();
                if (!cabinetId) {
                    this.showMessage('cabinet-message', 'Please enter a cabinet number', 'error');
                    return;
                }
                method = 'POST';
                endpoint = '/items/register';
                // Add cabinet to the form data for new cabinet
                this.tempItemData['Temporary Cabinet'] = cabinetId;
            }

            const result = await this.apiCall(endpoint, method, this.tempItemData);
            
            this.showMessage('cabinet-message', 
                selectedOption.value === 'available' 
                    ? `Item registered and auto-assigned to cabinet: ${result.assignedCabinet || 'N/A'}` 
                    : 'Item registered with new cabinet successfully!', 
                'success'
            );
            
            // Reset and go back to form
            setTimeout(() => {
                document.getElementById('register-item-form').reset();
                this.calculateTotalSample();
                this.goBackToForm();
            }, 2000);
            
        } catch (error) {
            this.showMessage('cabinet-message', error.message, 'error');
        }
    }

    calculateTotalSample() {
        const fieldIds = [
            'item-dummyunit',
            // Substrate defects
            'item-whitefm-substrate', 'item-blackfm-substrate', 'item-chip-substrate', 
            'item-scratches-substrate', 'item-crack-substrate', 'item-fmonfoot-substrate',
            'item-fmonshoulder-substrate', 'item-nfa-substrate', 'item-pfa-substrate',
            'item-footburr-substrate', 'item-shoulderbur-substrate', 'item-exposecopper-substrate',
            'item-resinbleed-substrate', 'item-void-substrate', 'item-copla-substrate',
            // Mold/MetalLid defects
            'item-whitefm-mold', 'item-blackfm-mold', 'item-edgechip-mold',
            'item-cornerchip-mold', 'item-scratches-mold', 'item-crack-mold',
            'item-illegiblemarking-mold',
            // Die defects
            'item-whitefm-die', 'item-blackfm-die', 'item-chip-die',
            'item-scratches-die', 'item-crack-die',
            // Bottom defects
            'item-whitefm-bottom', 'item-blackfm-bottom', 'item-chip-bottom',
            'item-scratches-bottom', 'item-crack-bottom', 'item-damageball-bottom',
            // Other defects
            'item-multiple-defect', 'item-pitch', 'item-sliver', 'item-ball-discoloration',
            'item-burr', 'item-fm-dambar', 'item-fm-lead', 'item-expose-copper-dambar',
            'item-mold-flash', 'item-metallic-particle', 'item-patchback', 'item-bent-lead',
            'item-expose-tie-bar', 'item-fiber', 'item-tool-mark', 'item-good-unit',
            'item-lead-shining', 'item-acid-test-burr'
        ];

        let total = 0;
        fieldIds.forEach(fieldId => {
            const element = document.getElementById(fieldId);
            if (element) {
                const value = parseInt(element.value) || 0;
                total += value;
            }
        });

        document.getElementById('item-totalsample').value = total;
    }

    async logout(showAuth = true) {
        this.stopHeartbeat();
        
        // Send logout request to server if token exists
        if (this.token) {
            try {
                await this.apiCall('/logout', 'POST');
                console.log('Logout successful - database connections should be reset');
            } catch (error) {
                console.warn('Logout API call failed:', error);
            }
        }
        
        this.token = null;
        this.user = {};
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        if (showAuth) {
            this.showAuth();
        }
    }

    handleLogout() {
        // Called when session is invalid
        this.logout(true);
    }

    showMessage(elementId, message, type) {
        const element = document.getElementById(elementId);
        element.innerHTML = `<div class="alert alert-${type === 'error' ? 'danger' : 'success'}">${message}</div>`;
        setTimeout(() => {
            element.innerHTML = '';
        }, 5000);
    }

    hideAllSections() {
        const sections = ['dashboard-section', 'register-item-section', 'borrow-items-section', 'my-items-section', 'admin-panel-section'];
        sections.forEach(section => {
            document.getElementById(section).classList.add('hidden');
        });
    }

    async showDashboard() {
        this.hideAllSections();
        document.getElementById('dashboard-section').classList.remove('hidden');
        
        try {
            const current = await this.apiCall('/borrow/current');
            const returnCount = current.borrowedItems.length;
            
            // Get connection status for debugging
            let connectionStatus = '';
            try {
                const connStatus = await this.apiCall('/connection-status', 'GET');
                connectionStatus = `
                    <div style="margin-top: 15px; padding: 10px; background: #f8f9fa; border-radius: 5px;">
                        <small><strong>DB Connections:</strong> ${connStatus.connectionDetails.poolStats.size} |
                        <strong>Active Users:</strong> ${connStatus.activeUsers} |
                        <strong>Status:</strong> ${connStatus.success ? 'OK' : 'Error'}</small>
                    </div>
                `;
            } catch (error) {
                console.warn('Could not get connection status:', error);
            }
            
            document.getElementById('user-dashboard').innerHTML = `
                <h3>Welcome, ${this.user.email || this.user.id}!</h3>
                <p><strong>Currently Borrowed Items:</strong> ${returnCount}</p>
                ${returnCount > 0 ? '<p>You have items that need to be returned. Check "My Items" section.</p>' : '<p>No items currently borrowed.</p>'}
                ${connectionStatus}
            `;
        } catch (error) {
            console.error('Error loading dashboard:', error);
        }
    }

    showRegisterItem() {
        this.hideAllSections();
        document.getElementById('register-item-section').classList.remove('hidden');
        this.setupAutoCalculation();
    }

    setupAutoCalculation() {
        const fieldIds = [
            'item-dummyunit',
            // Substrate defects
            'item-whitefm-substrate', 'item-blackfm-substrate', 'item-chip-substrate', 
            'item-scratches-substrate', 'item-crack-substrate', 'item-fmonfoot-substrate',
            'item-fmonshoulder-substrate', 'item-nfa-substrate', 'item-pfa-substrate',
            'item-footburr-substrate', 'item-shoulderbur-substrate', 'item-exposecopper-substrate',
            'item-resinbleed-substrate', 'item-void-substrate', 'item-copla-substrate',
            // Mold/MetalLid defects
            'item-whitefm-mold', 'item-blackfm-mold', 'item-edgechip-mold',
            'item-cornerchip-mold', 'item-scratches-mold', 'item-crack-mold',
            'item-illegiblemarking-mold',
            // Die defects
            'item-whitefm-die', 'item-blackfm-die', 'item-chip-die',
            'item-scratches-die', 'item-crack-die',
            // Bottom defects
            'item-whitefm-bottom', 'item-blackfm-bottom', 'item-chip-bottom',
            'item-scratches-bottom', 'item-crack-bottom', 'item-damageball-bottom',
            // Other defects
            'item-multiple-defect', 'item-pitch', 'item-sliver', 'item-ball-discoloration',
            'item-burr', 'item-fm-dambar', 'item-fm-lead', 'item-expose-copper-dambar',
            'item-mold-flash', 'item-metallic-particle', 'item-patchback', 'item-bent-lead',
            'item-expose-tie-bar', 'item-fiber', 'item-tool-mark', 'item-good-unit',
            'item-lead-shining', 'item-acid-test-burr'
        ];

        fieldIds.forEach(fieldId => {
            const element = document.getElementById(fieldId);
            if (element) {
                element.addEventListener('input', () => this.calculateTotalSample());
                element.addEventListener('change', () => this.calculateTotalSample());
            }
        });

        // Initialize calculation
        this.calculateTotalSample();
    }

    async showBorrowItems() {
        this.hideAllSections();
        document.getElementById('borrow-items-section').classList.remove('hidden');
        
        try {
            const categories = await this.apiCall('/items/categories');
            const categorySelect = document.getElementById('filter-category');
            categorySelect.innerHTML = '<option value="">All Categories</option>';
            categories.categories.forEach(category => {
                categorySelect.innerHTML += `<option value="${category}">${category}</option>`;
            });

            // Load initial package codes (without category filter)
            await this.loadPackageCodes();

            // Add event listener for category change
            categorySelect.addEventListener('change', async () => {
                await this.loadPackageCodes();
            });

        } catch (error) {
            console.error('Error loading filters:', error);
        }
    }

    async loadPackageCodes() {
        const category = document.getElementById('filter-category').value;
        const packageSelect = document.getElementById('filter-package-code');
        
        try {
            let url = '/items/package-codes';
            if (category) {
                url += `?category=${encodeURIComponent(category)}`;
            }
            
            const packageCodes = await this.apiCall(url);
            packageSelect.innerHTML = '<option value="">All Package Codes</option>';
            packageCodes.package_codes.forEach(code => {
                packageSelect.innerHTML += `<option value="${code}">${code}</option>`;
            });
        } catch (error) {
            console.error('Error loading package codes:', error);
            packageSelect.innerHTML = '<option value="">Error loading package codes</option>';
        }
    }

    async showMyItems() {
        this.hideAllSections();
        document.getElementById('my-items-section').classList.remove('hidden');
        
        try {
            const current = await this.apiCall('/borrow/current');
            const returnable = await this.apiCall('/return/returnable');
            const pending = await this.apiCall('/return/pending');

            this.displayBorrowedItems(current.borrowedItems);
            this.displayReturnableItems(returnable.returnableItems);
            this.displayPendingReturns(pending.pendingReturns);
        } catch (error) {
            console.error('Error loading my items:', error);
        }
    }

    async showAdminPanel() {
        if (this.user.role !== 'Admin') return;
        
        this.hideAllSections();
        document.getElementById('admin-panel-section').classList.remove('hidden');
        
        try {
            const stats = await this.apiCall('/admin/dashboard');
            const borrowed = await this.apiCall('/admin/borrowed');
            const approvals = await this.apiCall('/admin/pending-approvals');
            const overdue = await this.apiCall('/admin/overdue');

            this.displayAdminStats(stats.stats);
            this.displayAllBorrowedItems(borrowed.borrowHistory);
            this.displayPendingApprovals(approvals.pendingApprovals);
            this.displayOverdueItems(overdue.overdueItems);
        } catch (error) {
            console.error('Error loading admin panel:', error);
        }
    }

    displayBorrowedItems(items) {
        const container = document.getElementById('borrowed-items');
        if (items.length === 0) {
            container.innerHTML = '<p>No items currently borrowed.</p>';
            return;
        }

        let html = '<table class="table"><tr><th>Box ID</th><th>Category</th><th>Samples</th><th>Time Left</th></tr>';
        items.forEach(item => {
            const timeClass = item.timeLeft.hours > 4 ? 'timer-green' : item.timeLeft.hours > 1 ? 'timer-yellow' : 'timer-red';
            html += `<tr>
                <td>${item.item ? item.item['Temporary Cabinet'] : item.cabinet_location}</td>
                <td>${item.item ? item.item.Category : 'N/A'}</td>
                <td>${item.expected_samples}</td>
                <td class="${timeClass}">${item.timeLeft.hours}h ${item.timeLeft.minutes}m ${item.timeLeft.expired ? '(EXPIRED)' : ''}</td>
            </tr>`;
        });
        html += '</table>';
        container.innerHTML = html;
    }

    displayReturnableItems(items) {
        const container = document.getElementById('returnable-items');
        if (items.length === 0) {
            container.innerHTML = '<p>No items available for return.</p>';
            return;
        }

        let html = '<table class="table"><tr><th>Box ID</th><th>Category</th><th>Expected Samples</th><th>Action</th></tr>';
        items.forEach(item => {
            html += `<tr>
                <td>${item.item ? item.item['Temporary Cabinet'] : item.cabinet_location}</td>
                <td>${item.item ? item.item.Category : 'N/A'}</td>
                <td>${item.expected_samples}</td>
                <td><button onclick="app.showReturnModal(${item.id})" class="btn btn-warning">Return</button></td>
            </tr>`;
        });
        html += '</table>';
        container.innerHTML = html;
    }

    displayPendingReturns(items) {
        const container = document.getElementById('pending-returns');
        if (items.length === 0) {
            container.innerHTML = '<p>No pending returns.</p>';
            return;
        }

        let html = '<table class="table"><tr><th>Box ID</th><th>Returned Samples</th><th>Expected</th><th>Status</th><th>Justification</th></tr>';
        items.forEach(item => {
            html += `<tr>
                <td>${item.item ? item.item['Temporary Cabinet'] : item.cabinet_location}</td>
                <td>${item.returned_samples}</td>
                <td>${item.expected_samples}</td>
                <td>${item.admin_approved === null ? 'Pending' : item.admin_approved ? 'Approved' : 'Rejected'}</td>
                <td>${item.justification || 'N/A'}</td>
            </tr>`;
        });
        html += '</table>';
        container.innerHTML = html;
    }

    displayAdminStats(stats) {
        const container = document.getElementById('admin-stats');
        container.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px;">
                <div style="text-align: center; padding: 15px; background: #3498db; color: white; border-radius: 5px;">
                    <h3>${stats.totalBorrowed}</h3>
                    <p>Currently Borrowed</p>
                </div>
                <div style="text-align: center; padding: 15px; background: #f39c12; color: white; border-radius: 5px;">
                    <h3>${stats.overdueItems}</h3>
                    <p>Overdue Items</p>
                </div>
                <div style="text-align: center; padding: 15px; background: #e74c3c; color: white; border-radius: 5px;">
                    <h3>${stats.pendingApprovals}</h3>
                    <p>Pending Approvals</p>
                </div>
                <div style="text-align: center; padding: 15px; background: #27ae60; color: white; border-radius: 5px;">
                    <h3>${stats.availableItems}</h3>
                    <p>Available Items</p>
                </div>
            </div>
        `;
    }

    displayAllBorrowedItems(items) {
        const container = document.getElementById('all-borrowed-items');
        if (items.length === 0) {
            container.innerHTML = '<p>No borrowed items.</p>';
            return;
        }

        let html = '<table class="table"><tr><th>User</th><th>Box ID</th><th>Category</th><th>Status</th><th>Borrowed At</th></tr>';
        items.forEach(item => {
            html += `<tr>
                <td>${item.borrower.name} (${item.borrower.email})</td>
                <td>${item.item.box_id}</td>
                <td>${item.item.category}</td>
                <td>${item.return_status}</td>
                <td>${new Date(item.borrowed_at).toLocaleString()}</td>
            </tr>`;
        });
        html += '</table>';
        container.innerHTML = html;
    }

    displayPendingApprovals(items) {
        const container = document.getElementById('pending-approvals');
        if (items.length === 0) {
            container.innerHTML = '<p>No pending approvals.</p>';
            return;
        }

        let html = '<table class="table"><tr><th>User</th><th>Box ID</th><th>Returned/Expected</th><th>Justification</th><th>Action</th></tr>';
        items.forEach(item => {
            html += `<tr>
                <td>${item.borrower.name}</td>
                <td>${item.item.box_id}</td>
                <td>${item.returned_samples}/${item.expected_samples}</td>
                <td>${item.justification}</td>
                <td>
                    <button onclick="app.approveReturn(${item.id}, true)" class="btn btn-success">Approve</button>
                    <button onclick="app.approveReturn(${item.id}, false)" class="btn btn-danger">Reject</button>
                </td>
            </tr>`;
        });
        html += '</table>';
        container.innerHTML = html;
    }

    displayOverdueItems(items) {
        const container = document.getElementById('overdue-items');
        if (items.length === 0) {
            container.innerHTML = '<p>No overdue items.</p>';
            return;
        }

        let html = '<table class="table"><tr><th>User</th><th>Box ID</th><th>Due Date</th><th>Overdue Hours</th></tr>';
        items.forEach(item => {
            html += `<tr>
                <td>${item.borrower.name}</td>
                <td>${item.item.box_id}</td>
                <td>${new Date(item.due_at).toLocaleString()}</td>
                <td class="timer-red">${item.overdueInfo.hours}h</td>
            </tr>`;
        });
        html += '</table>';
        container.innerHTML = html;
    }

    async loadAvailableItems() {
        const category = document.getElementById('filter-category').value;
        const packageCode = document.getElementById('filter-package-code').value;
        
        let query = '';
        if (category) query += `category=${category}&`;
        if (packageCode) query += `packagecode=${packageCode}&`;
        
        try {
            const result = await this.apiCall(`/borrow/available?${query}`);
            this.displayAvailableItems(result.items);
        } catch (error) {
            console.error('Error loading available items:', error);
        }
    }

    displayAvailableItems(items) {
        const container = document.getElementById('available-items');
        if (items.length === 0) {
            container.innerHTML = '<p>No items available for borrowing.</p>';
            return;
        }

        let html = '<table class="table"><tr><th>Box ID</th><th>Category</th><th>Package Code</th><th>Package Description</th><th>Samples</th><th>Action</th></tr>';
        items.forEach(item => {
            const itemId = `item-${item['Temporary Cabinet'].replace(/[^a-zA-Z0-9]/g, '-')}`;
            html += `<tr>
                <td>${item['Temporary Cabinet']}</td>
                <td>${item.Category}</td>
                <td>${item.Packagecode}</td>
                <td>${item.Packagedescription || 'N/A'}</td>
                <td>
                    <span style="cursor: pointer; color: #007bff;" onclick="app.showSampleDetails('${item['Temporary Cabinet']}')" title="View detailed breakdown">
                        👁️ ${item.TotalSample}
                    </span>
                </td>
                <td><button onclick="app.borrowItem('${item['Temporary Cabinet']}')" class="btn btn-success">Borrow</button></td>
            </tr>`;
        });
        html += '</table>';
        container.innerHTML = html;
    }

    async showSampleDetails(cabinetLocation) {
        try {
            const result = await this.apiCall(`/items/details/${cabinetLocation}`);
            const item = result.item;
            
            if (!item) {
                alert('Item details not found.');
                return;
            }

            // Create detailed breakdown of samples
            const sampleDetails = this.createSampleBreakdown(item);
            
            // Create and show modal
            this.showSampleModal(item['Temporary Cabinet'], item.Packagecode, sampleDetails, item.TotalSample);
        } catch (error) {
            console.error('Error loading item details:', error);
            alert('Error loading sample details.');
        }
    }

    createSampleBreakdown(item) {
        const samples = [];
        
        // Add dummy units
        if (item.Dummyunit && parseInt(item.Dummyunit) > 0) {
            samples.push({ type: 'Dummy Unit', quantity: parseInt(item.Dummyunit) });
        }

        // Substrate defects
        const substrateDefects = [
            { key: 'WhiteFM(Substrate)', label: 'White FM (Substrate)' },
            { key: 'BlackFM(Substrate)', label: 'Black FM (Substrate)' },
            { key: 'Chip(Substrate)', label: 'Chip (Substrate)' },
            { key: 'Scratches(Substrate)', label: 'Scratches (Substrate)' },
            { key: 'Crack(Substrate)', label: 'Crack (Substrate)' },
            { key: 'FMonFoot(Substrate)', label: 'FM on Foot (Substrate)' },
            { key: 'FMonShoulder(Substrate)', label: 'FM on Shoulder (Substrate)' },
            { key: 'NFA(Substrate)', label: 'NFA (Substrate)' },
            { key: 'PFA(Substrate)', label: 'PFA (Substrate)' },
            { key: 'Footburr(Substrate)', label: 'Foot Burr (Substrate)' },
            { key: 'Shoulderbur(Substrate)', label: 'Shoulder Burr (Substrate)' },
            { key: 'Exposecopper(Substrate)', label: 'Exposed Copper (Substrate)' },
            { key: 'Resinbleed(Substrate)', label: 'Resin Bleed (Substrate)' },
            { key: 'void(Substrate)', label: 'Void (Substrate)' },
            { key: 'Copla(Substrate)', label: 'Copla (Substrate)' }
        ];

        // Mold/MetalLid defects
        const moldDefects = [
            { key: 'WhiteFM(Mold/MetalLid)', label: 'White FM (Mold/Metal Lid)' },
            { key: 'BlackFM(Mold/MetalLid)', label: 'Black FM (Mold/Metal Lid)' },
            { key: 'EdgeChip(Mold/MetalLid)', label: 'Edge Chip (Mold/Metal Lid)' },
            { key: 'CornerChip(Mold/MetalLid)', label: 'Corner Chip (Mold/Metal Lid)' },
            { key: 'Scratches(Mold/MetalLid)', label: 'Scratches (Mold/Metal Lid)' },
            { key: 'Crack(Mold/MetalLid)', label: 'Crack (Mold/Metal Lid)' },
            { key: 'Illegiblemarking(Mold/MetalLid)', label: 'Illegible Marking (Mold/Metal Lid)' }
        ];

        // Die defects
        const dieDefects = [
            { key: 'WhiteFM(Die)', label: 'White FM (Die)' },
            { key: 'BlackFM(Die)', label: 'Black FM (Die)' },
            { key: 'Chip(Die)', label: 'Chip (Die)' },
            { key: 'Scratches(Die)', label: 'Scratches (Die)' },
            { key: 'Crack(Die)', label: 'Crack (Die)' }
        ];

        // Bottom defects
        const bottomDefects = [
            { key: 'WhiteFM(BottomDefect)', label: 'White FM (Bottom)' },
            { key: 'BlackFM(BottomDefect)', label: 'Black FM (Bottom)' },
            { key: 'Chip(BottomDefect)', label: 'Chip (Bottom)' },
            { key: 'Scratches(BottomDefect)', label: 'Scratches (Bottom)' },
            { key: 'Crack(BottomDefect)', label: 'Crack (Bottom)' },
            { key: 'Damageball(BottomDefect)', label: 'Damage Ball (Bottom)' }
        ];

        // Other defects
        const otherDefects = [
            { key: 'Multiple Defect', label: 'Multiple Defect' },
            { key: 'Pitch', label: 'Pitch' },
            { key: 'Sliver', label: 'Sliver' },
            { key: 'Ball Discoloration', label: 'Ball Discoloration' },
            { key: 'Burr', label: 'Burr' },
            { key: 'FM on Dambar', label: 'FM on Dambar' },
            { key: 'FM on Lead', label: 'FM on Lead' },
            { key: 'Expose Copper on Dambar', label: 'Exposed Copper on Dambar' },
            { key: 'Mold Flash', label: 'Mold Flash' },
            { key: 'Metallic Particle', label: 'Metallic Particle' },
            { key: 'Patchback', label: 'Patchback' },
            { key: 'Bent Lead', label: 'Bent Lead' },
            { key: 'Expose Tie Bar', label: 'Exposed Tie Bar' },
            { key: 'Fiber', label: 'Fiber' },
            { key: 'Tool Mark', label: 'Tool Mark' },
            { key: 'Good Unit', label: 'Good Unit' },
            { key: 'Lead Shining', label: 'Lead Shining' },
            { key: 'Acid Test Burr', label: 'Acid Test Burr' }
        ];

        const allDefects = [...substrateDefects, ...moldDefects, ...dieDefects, ...bottomDefects, ...otherDefects];
        
        allDefects.forEach(defect => {
            const quantity = parseInt(item[defect.key]) || 0;
            if (quantity > 0) {
                samples.push({ type: defect.label, quantity });
            }
        });

        return samples;
    }

    showSampleModal(boxId, packageCode, sampleDetails, totalSamples) {
        // Remove existing modal if present
        const existingModal = document.getElementById('sample-details-modal');
        if (existingModal) {
            existingModal.remove();
        }

        // Create modal HTML
        const modalHtml = `
            <div id="sample-details-modal" style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.5);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 1000;
            ">
                <div style="
                    background: white;
                    border-radius: 8px;
                    padding: 20px;
                    max-width: 500px;
                    max-height: 80vh;
                    overflow-y: auto;
                    width: 90%;
                ">
                    <div style="display: flex; justify-content: between; align-items: center; margin-bottom: 15px;">
                        <h3 style="margin: 0;">Sample Details</h3>
                        <button onclick="app.closeSampleModal()" style="
                            background: #dc3545;
                            color: white;
                            border: none;
                            border-radius: 4px;
                            padding: 5px 10px;
                            cursor: pointer;
                            float: right;
                        ">×</button>
                    </div>
                    <div style="margin-bottom: 10px;">
                        <strong>Box ID:</strong> ${boxId}<br>
                        <strong>Package Code:</strong> ${packageCode}<br>
                        <strong>Total Samples:</strong> ${totalSamples}
                    </div>
                    <div style="border-top: 1px solid #ddd; padding-top: 15px;">
                        <h4>Sample Breakdown:</h4>
                        ${sampleDetails.length > 0 ? `
                            <table style="width: 100%; border-collapse: collapse;">
                                <tr style="background: #f8f9fa;">
                                    <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Type</th>
                                    <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Quantity</th>
                                </tr>
                                ${sampleDetails.map(sample => `
                                    <tr>
                                        <td style="border: 1px solid #ddd; padding: 8px;">${sample.type}</td>
                                        <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${sample.quantity}</td>
                                    </tr>
                                `).join('')}
                                <tr style="background: #f8f9fa; font-weight: bold;">
                                    <td style="border: 1px solid #ddd; padding: 8px;">TOTAL</td>
                                    <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${totalSamples}</td>
                                </tr>
                            </table>
                        ` : '<p>No detailed breakdown available.</p>'}
                    </div>
                </div>
            </div>
        `;

        // Add modal to page
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Add click outside to close
        document.getElementById('sample-details-modal').addEventListener('click', (e) => {
            if (e.target.id === 'sample-details-modal') {
                this.closeSampleModal();
            }
        });
    }

    closeSampleModal() {
        const modal = document.getElementById('sample-details-modal');
        if (modal) {
            modal.remove();
        }
    }

    async borrowItem(cabinetLocation) {
        try {
            await this.apiCall(`/borrow/${cabinetLocation}`, 'POST');
            alert('Item borrowed successfully!');
            this.loadAvailableItems();
        } catch (error) {
            alert('Error borrowing item: ' + error.message);
        }
    }


    showReturnModal(itemId) {
        const samples = prompt('Enter the number of samples you are returning:');
        if (samples === null) return;

        const returnedSamples = parseInt(samples);
        if (isNaN(returnedSamples) || returnedSamples < 0) {
            alert('Please enter a valid number of samples.');
            return;
        }

        this.returnItem(itemId, returnedSamples, null);
    }

    async returnItem(itemId, returnedSamples, justification) {
        try {
            const data = { returned_samples: returnedSamples };
            if (justification) data.justification = justification;

            await this.apiCall(`/return/${itemId}`, 'POST', data);
            alert('Item return submitted successfully!');
            this.showMyItems();
        } catch (error) {
            // Check if server requires justification
            if (error.message.includes('Justification is required')) {
                const providedJustification = prompt('Please provide justification for returning fewer samples than expected:');
                if (providedJustification && providedJustification.trim()) {
                    // Retry with justification
                    this.returnItem(itemId, returnedSamples, providedJustification.trim());
                    return;
                } else {
                    alert('Justification is required when returning fewer samples.');
                    return;
                }
            }
            alert('Error returning item: ' + error.message);
        }
    }

    async approveReturn(borrowId, approved) {
        const comments = prompt('Admin comments (optional):');
        
        try {
            await this.apiCall(`/admin/approve/${borrowId}`, 'POST', { 
                approved, 
                admin_comments: comments 
            });
            alert(`Return ${approved ? 'approved' : 'rejected'} successfully!`);
            this.showAdminPanel();
        } catch (error) {
            alert('Error processing approval: ' + error.message);
        }
    }
}

// Initialize the app
const app = new StorageManagementApp();

// Event listeners
document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    app.login(email, password);
});

document.getElementById('register-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const role = document.getElementById('register-role').value;
    app.register(name, email, password, role);
});

document.getElementById('register-item-form').addEventListener('submit', (e) => {
    e.preventDefault();
    app.registerItem();
});

// Navigation functions
function showLogin() {
    document.getElementById('register-section').classList.add('hidden');
    document.getElementById('login-form').classList.remove('hidden');
}

function showRegister() {
    document.getElementById('register-section').classList.remove('hidden');
    document.getElementById('login-form').classList.add('hidden');
}

function showDashboard() { app.showDashboard(); }
function showRegisterItem() { app.showRegisterItem(); }
function showBorrowItems() { app.showBorrowItems(); }
function showMyItems() { app.showMyItems(); }
function showAdminPanel() { app.showAdminPanel(); }
function logout() { app.logout(); }