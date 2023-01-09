#!/bin/bash

## function to check we're not on the main branch, deal with it if we are
function branchTest {
  if [[ $(cd ~/dotfiles && git status ~/dotfiles | grep 'On branch main') ]]; then
    echo "We're on the main branch, we should work on a specific one for this box"
    box=$(hostname -s)
    cd ~/dotfiles
    [[ $(git branch | grep $box) ]] && echo "This box already has a branch, checking it out" && git checkout $box
    [[ ! $(git branch | grep $box) ]] && echo "This box doesnt have a branch, making one and checking it out" && git branch $box && git checkout $box
    branchTest
  else
    echo "Great, we're not on the main branch, lets proceed"
  fi
}

## function to do the setup, dotfiles present in home will be moved to the repo
## and symlinked back, dotfiles in the repo but not in home will just be symlinked
function setup {
  for i in $(ls ~/dotfiles | grep '^_'); do
    dotname=$(echo $i | sed 's|^_|.|')
    if [[ -e ~/$dotname ]]; then
      echo "You already have a $dotname in your home folder, if it isn't a symlink I'll move it to the dotfiles directory and symlink it back"
      [[ ! -L ~/$dotname ]] && mv ~/$dotname ~/dotfiles/$i && ln -s ~/dotfiles/$i ~/$dotname || echo "never mind, it was a symlink"
    else
      echo "You don't seem to have a $dotname in your home folder, linking the one from the dotfiles directory"
      ln -s ~/dotfiles/$i ~/$dotname
    fi
  done

  ## Sort out directories from within top layer folders
  for i in $(find ~/dotfiles/ -maxdepth 2 -mindepth 2 -type d | grep -v '\.git'); do
    dotdir=$(dirname $i | grep -o '[^/]*$')
    sub=$(basename $i)
    if [[ -e ~/.$dotdir ]]; then
      echo "OK, .$dotdir exists in your home dir"
      if [[ -e ~/.$dotdir/$sub ]]; then
        echo "OK, you already have a local version of.$dotdir/$sub, if it isn't a symlink I'll move it to dotfiles repo and symlink"
        [[ ! -L ~/.$dotdir/$sub ]] && mv ~/.$dotdir/$sub ~/dotfiles/$dotdir/$sub && ln -s ~/dotfiles/$dotdir/$sub ~/.$dotdir/$sub || echo "Never mind, it was a symlink"
      else
        echo "No $sub in your .$dotdir, symlinking the version from the dotfiles repo"
        ln -s ~/dotfiles/$dotdir/$sub ~/.$dotdir/$sub
      fi
    else
      echo "You dont have .$dotdir in your home, making it and symlinking $sub from the dotfiles repo"
      mkdir ~/.$dotdir && ln -s ~/dotfiles/$dotdir/$sub ~/.$dotdir/$sub
    fi
  done

  ## sort out files from within top layer folders
  for i in $(find ~/dotfiles/ -maxdepth 2 -mindepth 2 -type f | grep -v '\.git'); do
    dotdir=$(dirname $i | grep -o '[^/]*$')
    file=$(basename $i)
    if [[ -e ~/.$dotdir ]]; then
      echo "OK, .$dotdir exists in your home dir"
      if [[ -e ~/.$dotdir/$file ]]; then
        echo "OK, you already have a local version of.$dotdir/$file, if it isn't a symlink I'll move it to dotfiles repo and symlink"
        [[ ! -L ~/.$dotdir/$file ]] && mv ~/.$dotdir/$file ~/dotfiles/$dotdir/$file && ln -s ~/dotfiles/$dotdir/$file ~/.$dotdir/$file || echo "Never mind, it was a symlink"
      else
        echo "No $file in your .$dotdir, symlinking the version from the dotfiles repo"
        ln -s ~/dotfiles/$dotdir/$file ~/.$dotdir/$file
      fi
    else
      echo "You dont have .$dotdir in your home, making it and symlinking $file from the dotfiles repo"
      mkdir ~/.$dotdir && ln -s ~/dotfiles/$dotdir/$file ~/.$dotdir/$file
    fi
  done
}
## Do the branch test
branchTest

## Do the setup
setup

## Quit
exit
