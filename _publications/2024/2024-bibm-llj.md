---
title:          Efficient Prototype Consistency Learning in Semi-Supervised Medical Image Segmentation via Joint Uncertainty and Data Augmentation
date:           2024-04-03 00:10:00 +0800
selected:       true
pub:            "IEEE International Conference on Bioinformatics and Biomedicine 2024 (IEEE BIBM 2024)"
pub_last:       ' <span class="badge badge-pill badge-custom badge-warning">CCF B</span> <span class="badge badge-pill badge-custom badge-primary">Regular Paper </span>'
pub_date:       "2024"

abstract: >-
  Recently, prototype learning has emerged in semi-supervised medical image segmentation and achieved remarkable performance. However, the scarcity of labeled data limits the expressiveness of prototypes in previous methods, potentially hindering the complete representation of prototypes for class embedding. To overcome this issue, we propose an efficient prototype consistency learning via joint uncertainty quantification and data augmentation (EPCL-JUDA) to enhance the semantic expression of prototypes based on the framework of Mean-Teacher. The concatenation of original and augmented labeled data is fed into student network to generate expressive prototypes. Then, a joint uncertainty quantification method is devised to optimize pseudo-labels and generate reliable prototypes for original and augmented unlabeled data separately. High-quality global prototypes for each class are formed by fusing labeled and unlabeled prototypes, which are utilized to generate prototype-to-features to conduct consistency learning. Notably, a prototype network is proposed to reduce high memory requirements brought by the introduction of augmented data. Extensive experiments on Left Atrium, Pancreas-NIH, Type B Aortic Dissection datasets demonstrate EPCL-JUDA's superiority over previous state-of-the-art approaches, confirming the effectiveness of our framework. The code will be released soon. 
cover:       assets/images/covers/2024-bibm-llj.jpg
authors:   
  - Lijian Li
  - Yuanpeng He
  - Chi-Man Pun
links:
  Paper: 
  # Code:  https://github.com/heyuanpengpku/GUEF
  # Unsplash: https://unsplash.com/photos/sliced-in-half-pineapple--_PLJZmHZzk
---
