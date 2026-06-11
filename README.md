# air-pollution Africa

## Table of contents
  * [Description](#description)
  * [Techniques](#techniques)
  * [Installation](#installation)
  * [User Manual](#user-manual)
  * [Installation](#installation)
  * [Changelog](#changelog)
  * [Teammembers](#team-members)
  * [Sources](#sources)
  * [License](#license)


## Project Description

Air-pollution Africa is a project that began with [Jamie Buffing](https://github.com/JamieBuffing/KNMI_KUMASI) at CMD, but has now reached FDND-agency. This project is to measure the air pollution in cities where the readings might not always be correct from an aerial view. The city of Kumasi in Ghana has test tubes where they measure the amount of pollution and send their data into an excel sheet. Now the effect of air pollution can be seen to everyone who is curious about it through this project.

## Techniques

As is expected we've used some techniques that span across all pages. We have used these to make this website:
![SvelteKit 5](https://img.shields.io/badge/SvelteKit-5-FF3E00?style=flat&logo=svelte&logoColor=white)
![Svelte](https://img.shields.io/badge/Svelte-4A4A55?style=flat&logo=svelte&logoColor=FF3E00)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat&logo=css3&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat&logo=vite&logoColor=white)
![npm](https://img.shields.io/badge/npm-CB3837?style=flat&logo=npm&logoColor=white)
![Directus](https://img.shields.io/badge/Directus-64f?style=flat&logo=directus&logoColor=white)
![Figma](https://img.shields.io/badge/Figma-F24E1E?style=flat&logo=figma&logoColor=white)
![Netlify](https://img.shields.io/badge/Netlify-00C7B7?style=flat&logo=netlify&logoColor=white)



## Installation
1. Open a code editing software
2. Make a branch from the Dev branch so you'll won't touch the main project
3. Clone the repository's code from dev and make sure to click 'contribute for my own purposes.'
4. For the command line you enter the keys " ` and CTRL "
5. Type "npm install" to download the dependencies
6. Type "npm run dev" so you can start the project
7. Have fun with Sveltekit 



## User Manual

### 'Hackable url'
With our `[slug]` folder we made it possible to change to the city where there is data available. You can replace the city in the url to `/kumasi` or `/accra` to see the different measures in the air per city, per month.
 
### Map
The map on the current iteration of the homepage is one of the more complex codes on the website. You can interact with the map by dragging with your mouse or finger on mobile, this way you can navigate through the city of Kumasi in an aerial view. You can zoom in on the map by using the mouse wheel, double clicking on the part you want to be zoomed in on or on mobile use two fingers to press onto the map and divide them to zoom in.
<img width="397" height="344" alt="Screenshot 2026-06-11 142511" src="https://github.com/user-attachments/assets/3e035ab1-cb0a-481d-b406-3077da43841a" />

### Pins
On the map there are several pins that indicate the air pollution in the city you are currently observing. You can click on the pin and see the results that have been collected of a certain month in a certain year. The pins are differently colored in the way of green to red. Those colors indicate the air pollution.
<img width="520" height="754" alt="Screenshot 2026-06-11 142517" src="https://github.com/user-attachments/assets/89fee77a-250b-45b1-97c0-3fa809ecf9d1" />




## Changelog

### Sprint 6
In the sixth sprint of this project we got the briefing of this project and we made sure that we wrote down what Bas wanted. We read about the project, heard the briefing, wrote a debriefing and started analyzing the code that needed to be transferred.

### Sprint 7
In the seventh sprint of this project we started transferring and refactoring some of the code that was in the old project. The front-end devlopers transferred the EJS that was used and made it into proper HTML, while also transferring the CSS to the correct files and trying to understand the map. The CMD students had worked out a few more screens for the new design that is to be applied when the new team works on this. The software-developers worked on the backend of the code so the transferring of the data in Directus and the fetching in the project itself.

### Sprint 8
In sprint 8 the front-end and software developers worked on recreating the map that was on the original page and transferred it to Sveltekit 5. The map now works like it did before with the markers in the correct place and the data showing from multiple months.
 
 
### Teamwork
 
- [Commits](https://github.com/fdnd-agency/air-pollution-africa/blob/dev/docs/conventions/coventional-commits.md) are essential for updating your code for this project.
- [Pull requests](https://github.com/fdnd-agency/air-pollution-africa/blob/dev/docs/conventions/pull-request-conventions.md) are the way to make you code from your local branch to the dev branch.
- [Naming conventions](https://github.com/fdnd-agency/air-pollution-africa/blob/dev/docs/conventions/naming-conventions.md) is something that is important for a logical 'tree.' Your branches should be named logically so that you'll be able to clearly see which teammemeber works on which feature.
- [Component library sorting](https://github.com/fdnd-agency/air-pollution-africa/blob/31-fork/docs/conventions/atomic-design-conventions.md) is a way for sorting your components in a logical order. We have chosen for [atomic design.](https://atomicdesign.bradfrost.com/chapter-2/)
- [Coding conventions](https://atomicdesign.bradfrost.com/chapter-2/) are a way to write your own code. They are a subset of rules which the members on this project must follow.
 
### Design
 
This project has remained in the same style as was used in the previous version, but after the style has changed with the CMD restyle this with be applied


## Team Members

* Alex - Software Developer: [https://github.com/CesariHVA](https://github.com/CesariHVA)
* Wesley - Software Developer: [https://github.com/AstoraZ20968](https://github.com/AstoraZ20968)
* Keano - Software Developer: 
* Alisa - Designer: [https://github.com/AlisaAyad](https://github.com/AlisaAyad)
* Benjamin Designer: [https://github.com/Benji5711HvA](https://github.com/Benji5711HvA)
* Viresh - Front-end Developer: [https://github.com/https://github.com/vsheo](https://github.com/vsheo)
* Sidney - Front-end Developer: [https://github.com/Sidopjescherm](https://github.com/Sidopjescherm)

## Sources
- [SvelteKit tutorial](https://learn.svelte.dev/tutorial/introducing-sveltekit)
- [Dynamic component](https://www.youtube.com/watch?v=7h6slC4HcpI)
- [Directus fields](https://docs.directus.io/app/data-model/fields.html)

## License
This project is licensed under the terms of the [MIT license](./LICENSE).
