(function(){
  var role="Student",msg=document.getElementById("msg");
  var tabs=document.querySelectorAll(".tab");
  tabs.forEach(function(t){t.addEventListener("click",function(){
    tabs.forEach(function(x){x.setAttribute("aria-selected","false")});
    t.setAttribute("aria-selected","true");role=t.dataset.role;msg.textContent="";msg.className="msg";
    document.getElementById("email").placeholder="e.g. "+role.toLowerCase()+"@ugipnainital.ac.in";
  })});
  var pw=document.getElementById("pw"),eye=document.getElementById("eye");
  eye.addEventListener("click",function(){
    var show=pw.type==="password";pw.type=show?"text":"password";
    eye.setAttribute("aria-label",show?"Hide password":"Show password");
  });
  function say(t,c){msg.textContent=t;msg.className="msg "+c}
 
  var btn=document.getElementById("signin"),
      label=document.getElementById("signin-label"),
      icon=document.getElementById("signin-icon");
  function setLoading(on){
    btn.disabled=on;
    label.textContent=on?"Signing in...":"Sign In";
    icon.innerHTML=on?'<span class="spinner"></span>':"→";
    icon.setAttribute("aria-hidden","true");
  }
 
  document.getElementById("form").addEventListener("submit",function(e){
    e.preventDefault();
    if(btn.disabled)return;
    var u=document.getElementById("email").value.trim(),p=pw.value;
    if(!u||!p)return say("Enter your email and password to sign in.","err");
    if(p.length<6)return say("Password must be at least 6 characters.","err");
    say("","");
    setLoading(true);
    // Replace this timeout with your real authentication request.
    setTimeout(function(){
      setLoading(false);
      say(role+" sign-in checked. Connect your backend to complete authentication.","ok");
    },1500);
  });
 
  function stub(id,t){document.getElementById(id).addEventListener("click",function(e){e.preventDefault();say(t,"ok")})}
  stub("forgot","Contact your class Teacher to reset your password.");
  stub("google","Google sign-in needs OAuth set up first.");
  stub("reg","Link this to your VidyaOS registration page.");
  stub("fac","Link this to your Faculty & HOD application page.");
})();
 



/* Interactive related-photo gallery */
(() => {
  const collections = {
    campus: {
      title: 'Our Campus',
      description: 'Campus views, facilities and surroundings',
      images: [
        ['images/gallery-campus.jpg', 'UGIP Nainital campus entrance'],
        ['images/bg1-campus.jpg', 'Campus overview'],
        ['images/bg3-building.jpg', 'Institutional building'],
        ['images/image.png', 'Academic and administrative block'],
        ['images/all.jpg', 'Campus environment']
      ]
    },
    nainital: {
      title: 'Nainital',
      description: 'Nainital views and the Himalayan region',
      images: [
        ['images/gallery-nainital.jpg', 'Nainital lake and Himalayan peaks'],
        ['images/bg4-himalaya.jpg', 'Himalayan mountain view'],
        ['images/gallery-natural-beauty.jpg', 'Natural beauty near Nainital'],
        ['images/academic.png', 'Himalayan landscape']
      ]
    },
    academic: {
      title: 'Academic Block',
      description: 'Academic spaces and institutional life',
      images: [
        ['images/image.png', 'Academic and administrative block'],
        ['images/academic-teacher.png', 'Academic and teaching environment'],
        ['images/academic.png', 'Academic campus surroundings'],
        ['images/gallery-campus.jpg', 'UGIP Nainital campus']
      ]
    },
    nature: {
      title: 'Natural Beauty',
      description: 'Green landscapes and Himalayan scenery',
      images: [
        ['images/academic.png', 'Himalayan landscape'],
        ['images/gallery-natural-beauty.jpg', 'Natural beauty near Nainital'],
        ['images/bg4-himalaya.jpg', 'Himalayan mountain view'],
        ['images/gallery-nainital.jpg', 'Nainital lake']
      ]
    }
  };

  const modal = document.getElementById('galleryModal');
  if (!modal) return;
  const title = document.getElementById('galleryTitle');
  const description = document.getElementById('galleryDescription');
  const mainImage = document.getElementById('galleryMainImage');
  const thumbs = document.getElementById('galleryThumbs');
  const counter = document.getElementById('galleryCounter');
  const closeButton = document.getElementById('galleryClose');
  const modalUploadButton = document.getElementById('galleryUploadBtn');
  const modalUploadInput = document.getElementById('galleryModalUpload');
  let currentCollection = null;
  let currentIndex = 0;
  let lastTrigger = null;

  function render() {
    const items = collections[currentCollection].images;
    const item = items[currentIndex];
    mainImage.src = item[0];
    mainImage.alt = item[1];
    counter.textContent = `${currentIndex + 1} / ${items.length}`;
    thumbs.innerHTML = '';
    items.forEach((photo, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `gallery-thumb${index === currentIndex ? ' active' : ''}`;
      button.setAttribute('aria-label', `Show ${photo[1]}`);
      button.setAttribute('aria-current', index === currentIndex ? 'true' : 'false');
      const image = document.createElement('img');
      image.src = photo[0];
      image.alt = '';
      const caption = document.createElement('span');
      caption.textContent = photo[1];
      button.append(image, caption);
      button.addEventListener('click', () => {
        currentIndex = index;
        render();
      });
      thumbs.appendChild(button);
    });
  }

  function openGallery(category, trigger) {
    if (!collections[category]) return;
    currentCollection = category;
    currentIndex = 0;
    lastTrigger = trigger;
    title.textContent = collections[category].title;
    description.textContent = collections[category].description;
    render();
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('gallery-open');
    closeButton.focus();
  }

  function closeGallery() {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('gallery-open');
    if (lastTrigger) lastTrigger.focus();
  }

  document.querySelectorAll('[data-gallery]').forEach(button => {
    button.addEventListener('click', () => openGallery(button.dataset.gallery, button));
  });
  closeButton.addEventListener('click', closeGallery);
  document.getElementById('galleryPrev').addEventListener('click', () => {
    const count = collections[currentCollection].images.length;
    currentIndex = (currentIndex - 1 + count) % count;
    render();
  });
  document.getElementById('galleryNext').addEventListener('click', () => {
    const count = collections[currentCollection].images.length;
    currentIndex = (currentIndex + 1) % count;
    render();
  });
  modal.addEventListener('click', event => {
    if (event.target === modal) closeGallery();
  });
  document.addEventListener('keydown', event => {
    if (!modal.classList.contains('open')) return;
    if (event.key === 'Escape') closeGallery();
    if (event.key === 'ArrowLeft') document.getElementById('galleryPrev').click();
    if (event.key === 'ArrowRight') document.getElementById('galleryNext').click();
  });
  // Upload into the currently open category. This is a front-end permission notice/gate only;
  // real authorization must be enforced by the backend after login.
  modalUploadButton.addEventListener('click', () => {
    const confirmed = window.confirm('Restricted action: only teachers, faculty or administrators may upload or change gallery images. Confirm that you are authorized to continue.');
    if (confirmed) modalUploadInput.click();
  });
  modalUploadInput.addEventListener('change', () => {
    const files = Array.from(modalUploadInput.files || []).filter(file => file.type.startsWith('image/'));
    if (!files.length || !currentCollection) return;
    files.forEach(file => {
      const url = URL.createObjectURL(file);
      collections[currentCollection].images.push([url, file.name || 'Uploaded photo']);
    });
    currentIndex = collections[currentCollection].images.length - files.length;
    render();
    description.textContent = `${collections[currentCollection].description} • ${files.length} photo(s) added for this session`;
    modalUploadInput.value = '';
  });

  window.vidyaGalleryCollections = collections;
  window.vidyaOpenGallery = openGallery;
})();

/* Local image upload for the campus gallery (session-only previews). */
(() => {
  const uploadButton = document.getElementById('uploadImagesBtn');
  const uploadInput = document.getElementById('galleryUpload');
  const galleryGrid = document.querySelector('.gallery');
  if (!uploadButton || !uploadInput || !galleryGrid) return;
  let uploadedCard = null;
  const uploadedUrls = [];

  uploadButton.addEventListener('click', () => {
    const confirmed = window.confirm('Restricted action: only teachers, faculty or administrators may upload or change gallery images. Confirm that you are authorized to continue.');
    if (confirmed) uploadInput.click();
  });
  uploadInput.addEventListener('change', () => {
    const selected = Array.from(uploadInput.files || []).filter(file => file.type.startsWith('image/'));
    if (!selected.length) return;
    const collections = window.vidyaGalleryCollections;
    if (!collections.uploaded) collections.uploaded = {
      title: 'My Uploads', description: 'Images you added from this device', images: []
    };
    selected.forEach(file => {
      const url = URL.createObjectURL(file);
      uploadedUrls.push(url);
      collections.uploaded.images.push([url, file.name || 'Uploaded image']);
    });
    if (!uploadedCard) {
      uploadedCard = document.createElement('button');
      uploadedCard.type = 'button';
      uploadedCard.className = 'card uploaded-card';
      uploadedCard.dataset.gallery = 'uploaded';
      uploadedCard.setAttribute('aria-label', 'Open My Uploads gallery');
      uploadedCard.innerHTML = '<img alt="Your uploaded images"><span><i>★</i>My Uploads <b class="card-more">View gallery ↗</b></span>';
      galleryGrid.appendChild(uploadedCard);
      uploadedCard.addEventListener('click', () => window.vidyaOpenGallery('uploaded', uploadedCard));
    }
    uploadedCard.querySelector('img').src = collections.uploaded.images[0][0];
    uploadedCard.querySelector('img').alt = 'Your uploaded images';
    uploadButton.innerHTML = '<span>＋</span> Add More Images';
    uploadInput.value = '';
  });
  window.addEventListener('beforeunload', () => uploadedUrls.forEach(URL.revokeObjectURL));
})();
