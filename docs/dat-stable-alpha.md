# Announcing the dat stable alpha

*To keep up to date with the dat project you can follow [@dat_project](https://twitter.com/dat_project) on twitter or [watch the repo](https://github.com/maxogden/dat) on github.*

The first code went into dat one year ago, [on August 17th 2013](https://github.com/maxogden/dat/commit/e5eda57b53f60b05c0c3d97da90c10cd17dcbe19). Today, after a year of work, we are really excited to release the first major version of dat along with a [new website](http://dat-data.com).

<a href="http://dat-data.com">
  <img title="dat editor" alt="dat editor" src="https://raw.githubusercontent.com/maxogden/dat/master/img/dat-website.png"/>
</a>

Our overall goal with dat is to make a set of tools for creating and sharing streaming data pipelines, a sort of [ETL](http://en.wikipedia.org/wiki/Extract,_transform,_load) style system but designed from the ground up to be developer friendly, open source and streaming. We are aligned with the goals of the [frictionless data](http://blog.okfn.org/2013/04/24/frictionless-data-making-it-radically-easier-to-get-stuff-done-with-data/) initiative and see dat as an important tool for sharing data wrangling, munging and clean-up code so that data consumers can simply `dat clone` to get good data.

The first six months of dat development were spent making a prototype (thanks to the [Knight foundation Prototype Fund](http://www.knightfoundation.org/grants/201346305/)). In April of this year we were able to expand the team working on dat from 1 person to 3 persons, thanks to [support from the Sloan foundation](https://usodi.org/2014/04/02/dat). At that time dat also became an official [US Open Data Institute](https://usodi.org/) project, to ensure that open data remains a top priority going forward.

Sloan's proposition was that they like the initial dat prototype but wanted to see scientific data use cases be treated as top priority. As a result we expanded the scope of the project from its tabular-data-specific beginnings and have focused on adding features that will help us work with larger scientific datasets.

Up until this point, the dat API has been in flux, as we were constantly iterating on it. From this point forward we will be taking backwards compatibility much more seriously, so that third party developers can feel confident building on top of dat.

## How to get involved

### Try it out

You can [install dat today](https://github.com/maxogden/dat#install) and play around with it by importing or cloning a dataset.

The easiest way to try dat is to deploy a dat to Heroku for free directly from your browser using our [Dat Heroku Buttons](https://github.com/bmpvieira/heroku-dat-template#heroku-dat-template). No command line required!

The dat REST API comes bundled with the [dat-editor](https://github.com/maxogden/dat-editor#readme) web application.

<a href="https://github.com/maxogden/dat-editor">
  <img height="200" title="dat editor" alt="dat editor" src="https://raw.githubusercontent.com/maxogden/dat-editor/master/screenshot.png"/>
</a>

To start learning about how to use dat please read our [getting started guide](https://github.com/maxogden/dat/blob/master/docs/getting-started.md).

To help you choose an approach to loading data into dat we have created a [data importing guide](https://github.com/maxogden/dat/blob/master/docs/importing.md).

### Write a module or 5

The benefit of dat isn't in the dat module, but rather in the ecosystem that it enables to be built around it.

There are a lot of modules that we think would be really awesome to have, and [we started a wishlist here](https://github.com/datproject/discussions/issues/5). If you see something you are interested in building, please leave a comment on that thread stating your intent. Similarly, if there is a format or storage backend that you would like to see dat support, leave it in the comments.

## Pilot users

This release of dat represents our efforts to get it to a point where we can start working with scientists on modeling their data workflows with dat. We will now be starting concrete work on these pilot use cases.

If you have a use case in mind and you want to bounce it off of us please open at issue on the maxogden/dat repository with a detailed description.

While we don't have many details to share today about these pilots, we hope to change that over the new few months. 

### Bionode (Bioinformatics -- DNA)

<a href="http://bionode.io">
  <img height="100" width="100" title="bionode" alt="bionode logo" src="https://rawgithub.com/bionode/bionode/master/docs/bionode-logo.min.svg"/>
</a>

Dat core team member [@bmpvieira](https://github.com/bmpvieira/), a Bioinformatics PhD student at Queen Mary University in London, is working on applying dat to the domain of working with various DNA analysis related datasets.

Bruno runs the [Bionode](https://github.com/bionode) project. We will be working on integrating Bionode with dat workflows to solve common problems in DNA bioinformatics research.

### RNA-Seq (Bioinformatics -- RNA)

Two researchers from UC-San Diego reached out to us recently and have started explaining their use case [here](https://github.com/maxogden/dat/issues/129) and [here](https://github.com/maxogden/dat/issues/135). We hope to use dat to make their data management problems go away.

### Sloan Digital Sky Survey (Astronomy)

<a href="http://sdss.org">
  <img height="100" title="sdss" alt="sdss" src="https://raw.githubusercontent.com/maxogden/dat/master/img/sdss.png"/>
</a>

We will be working with the [SDSS](http://www.sdss.org/) project to share large their scans of the visible universe, and eventually connect their data with other sky survey data from other organizations.

## The future of dat

This release is the first step towards our goal of creating a streaming interface between every database or file storage backend in the world. We are trying to solve hard problems the right way. This is a process that takes a lot of time.

In the future we would also like to work on a way to easily host and share datasets online. We envision a sort of data package registry, similar to [npmjs.org](http://npmjs.org), but designed with datasets in mind. This kind of project could also eventually turn into a sort of "GitHub for data".

We also want to hook dat up to P2P networks, so that we can make downloads faster but also so that datasets become more permanent. Dat advisor Juan Benet is now working on [IPFS](http://ipfs.io/), which we are excited to hook up to dat when it is ready.

Certain datasets are simply too large to share, so we also expect to work on a distributed computation layer on top of dat in the future (similar to the [ESGF](http://esgf.llnl.gov/) project).

You can help us discuss these high level future ideas on [this issue](https://github.com/datproject/discussions/issues/1).
